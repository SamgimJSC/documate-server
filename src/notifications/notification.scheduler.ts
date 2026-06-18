import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';

import { DocumentAlert } from '../documents/entities/document-alert.entity';
import { Document } from '../documents/entities/document.entity';
import { TypeOrmNotificationRepository } from './model/notification.repository';
import { type NotificationRepository } from './model/notification.interface';
import { TypeOrmDeviceTokenRepository } from './model/device-token.repository';
import { type DeviceTokenRepository } from './model/device-token.interface';
import { NotificationCategory } from '../global/constants/notificationCategory.enum';
import { Platform } from '../global/constants/platform.enum';
import { FcmService } from './providers/fcm.service';

/*
  알림 스케줄러

  매일 정해진 시각에 자동 실행되어:
  1) document_alerts 테이블에서 발송 대상(오늘 또는 지난 + 미발송) 조회
  2) 각 건마다 notifications 테이블에 피드 기록 (앱 알림 목록용)
  3) channel_app_push 켜진 경우 FCM으로 실제 푸시 발송
  4) document_alerts.is_sent=true 로 발송 완료 표시
*/
@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    // DocumentAlert는 documents 모듈 소유지만,
    // 스케줄러에서 raw Repository로 읽기만 하므로 직접 주입
    @InjectRepository(DocumentAlert)
    private readonly documentAlertRepo: Repository<DocumentAlert>,
    @Inject(TypeOrmNotificationRepository)
    private readonly notificationRepo: NotificationRepository,
    @Inject(TypeOrmDeviceTokenRepository)
    private readonly deviceTokenRepo: DeviceTokenRepository,
    private readonly fcmService: FcmService,
  ) {}

  /*
    매일 오전 9시(KST)에 자동 실행
    
    크론 표현식 참고:
    - EVERY_DAY_AT_9AM: 매일 9시
    - EVERY_HOUR: 매시 정각
    - EVERY_5_MINUTES: 5분마다
    
    timeZone: 한국 시간 기준으로 동작
  */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, { timeZone: 'Asia/Seoul' })
  async dispatchDueAlerts(): Promise<void> {
    const today = new Date();

    // 발송 대상: notify_date <= today AND is_sent = false
    const dueAlerts = await this.documentAlertRepo.find({
      where: { isSent: false, notifyDate: LessThanOrEqual(today) },
      relations: { document: true },
    });
    const validAlerts = dueAlerts.filter(a => !a.document?.isDeleted);

    if (validAlerts.length === 0) {
      this.logger.log('발송 대상 알림이 없습니다.');
      return;
    }

    this.logger.log(`발송 대상 알림 ${validAlerts.length}건 처리 시작`);

    let success = 0;
    let failed = 0;

    for (const alert of validAlerts) {
      try {
        await this.processAlert(alert);
        success++;
      } catch (err) {
        failed++;
        this.logger.error(
          `알림 처리 실패 (alertId=${alert.alertId})`,
          err instanceof Error ? err.stack : String(err),
        );
      }
    }

    this.logger.log(`알림 처리 완료 — 성공 ${success}건 / 실패 ${failed}건`);
  }

  /*
     개별 알림 처리
  1) notifications 피드 기록
  2) FCM으로 푸시 발송 (앱/웹 채널 둘 중 하나라도 켜져있으면)
  3) document_alerts 발송 완료 처리
  */
  private async processAlert(alert: DocumentAlert): Promise<void> {
    const title = this.buildTitle(alert);
    const body = alert.reason ?? '';

    // 1) notifications 피드 기록 (앱 내 알림 목록용)
    await this.notificationRepo.createNotification({
      userId: alert.userId,
      documentId: alert.documentId,
      category: NotificationCategory.DOC,
      title,
      body,
    });

    // 2) FCM 푸시 발송
    // - 앱 푸시 또는 웹 푸시 채널 중 하나라도 켜져있으면 발송
    // - FCM이 IOS/ANDROID/WEB 토큰을 알아서 구분해서 보냄
    // - 사용자가 어떤 채널 토글했는지에 따라 해당 플랫폼 토큰만 추리는 건 아래 메서드에서 처리
    if (alert.channelAppPush || alert.channelWebPush) {
      await this.sendFcmPush(
        alert.userId,
        title,
        body,
        alert.documentId,
        alert.channelAppPush,
        alert.channelWebPush,
      );
    }

    // 3) document_alerts 발송 완료 처리
    await this.documentAlertRepo.update(
      { alertId: alert.alertId },
      { isSent: true, sentAt: new Date() },
    );

    // TODO: 이메일 채널은 시원님의 NodeMailer 발송 안정화 이후 연결
    // if (alert.channelEmail) await this.mailer.send(...);
  }
  /*
  사용자의 활성 디바이스 토큰을 가져와 FCM으로 멀티캐스트
  - channelAppPush가 true이면 IOS/ANDROID 토큰 포함
  - channelWebPush가 true이면 WEB 토큰 포함
*/
  private async sendFcmPush(
    userId: string,
    title: string,
    body: string,
    documentId: string | null,
    includeAppPush: boolean,
    includeWebPush: boolean,
  ): Promise<void> {
    const devices = await this.deviceTokenRepo.findByUserId(userId);

    // 사용자가 켠 채널에 해당하는 토큰만 필터링
    const tokens = devices
      .filter((d) => {
        if (d.platform === Platform.WEB) return includeWebPush;
        return includeAppPush; // IOS or ANDROID
      })
      .map((d) => d.token);

    if (tokens.length === 0) {
      this.logger.warn(
        `발송 가능한 디바이스 토큰이 없습니다. userId=${userId}`,
      );
      return;
    }

    await this.fcmService.sendMulti({
      tokens,
      title,
      body,
      data: documentId ? { documentId, category: 'DOC' } : { category: 'DOC' },
    });
  }

  /*
    알림 제목 만들기
    예: "건강보험 D-3", "임대차계약서 D-Day", "처방전 D+1"
  */
  private buildTitle(alert: DocumentAlert & { document?: Document }): string {
    const docTitle = alert.document?.title ?? '문서';
    const dDay = this.getDDayLabel(alert.notifyDate);
    return `${docTitle} ${dDay}`;
  }

  /*
    오늘 기준 D-Day 라벨 계산
  */
  private getDDayLabel(notifyDate: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(notifyDate);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round(
      (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return 'D-Day';
    if (diffDays > 0) return `D-${diffDays}`;
    return `D+${Math.abs(diffDays)}`;
  }
}
