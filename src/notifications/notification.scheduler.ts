import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';

import { DocumentAlert } from '../documents/entities/document-alert.entity';
import { Document } from '../documents/entities/document.entity';
import { UserSettings } from '../users/entities/user-settings.entity';
import { TypeOrmNotificationRepository } from './model/notification.repository';
import { type NotificationRepository } from './model/notification.interface';
import { TypeOrmDeviceTokenRepository } from './model/device-token.repository';
import { type DeviceTokenRepository } from './model/device-token.interface';
import { NotificationCategory } from '../global/constants/notificationCategory.enum';
import { Platform } from '../global/constants/platform.enum';
import { FcmService } from './providers/fcm.service';
import { NodeMailer } from '../auth/providors/nodeMailer';

/*
  알림 스케줄러

  매일 정해진 시각에 자동 실행되어:
  1) document_alerts 테이블에서 발송 대상(오늘 또는 지난 + 미발송) 조회
  2) 각 건마다 notifications 테이블에 피드 기록 (앱 알림 목록용)
  3) channel_app_push 켜진 경우 FCM으로 실제 푸시 발송
  4) document_alerts.is_sent=true 로 발송 완료 표시
*/
@Injectable()
export class NotificationScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    // DocumentAlert는 documents 모듈 소유지만,
    // 스케줄러에서 raw Repository로 읽기만 하므로 직접 주입
    @InjectRepository(DocumentAlert)
    private readonly documentAlertRepo: Repository<DocumentAlert>,
    @InjectRepository(UserSettings)
    private readonly userSettingsRepo: Repository<UserSettings>,
    @Inject(TypeOrmNotificationRepository)
    private readonly notificationRepo: NotificationRepository,
    @Inject(TypeOrmDeviceTokenRepository)
    private readonly deviceTokenRepo: DeviceTokenRepository,
    private readonly fcmService: FcmService,
    private readonly nodeMailer: NodeMailer,
  ) {}

  /*
    서버 기동 시 1회 캐치업 실행
    - 프로세스가 9시 크론 시각에 떠있지 않았다면(재배포, 슬립 등) 그날 알림이
      다음날 크론까지 밀리는 문제가 있었음 (재발 사례 확인됨)
    - 재시작될 때마다 즉시 한 번 밀린 알림을 확인해서, 최대 지연을
      "프로세스가 다시 떠서 크론이 정상적으로 돌 때까지"로 줄임
  */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('서버 기동 — 밀린 알림 캐치업 확인');
    await this.dispatchDueAlerts();
  }

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
      relations: { document: true, user: true },
    });
    const validAlerts = dueAlerts.filter(a => a.document != null);

    if (validAlerts.length === 0) {
      this.logger.log('발송 대상 알림이 없습니다.');
      return;
    }

    this.logger.log(`발송 대상 알림 ${validAlerts.length}건 처리 시작`);

    // 관련 유저의 설정을 한 번에 로드 (N+1 방지)
    const userIds = [...new Set(validAlerts.map((a) => a.userId))];
    const settingsList = await this.userSettingsRepo.find({
      where: { userId: In(userIds) },
    });
    const settingsMap = new Map(settingsList.map((s) => [s.userId, s]));

    let success = 0;
    let failed = 0;

    for (const alert of validAlerts) {
      try {
        const userSettings = settingsMap.get(alert.userId) ?? null;
        await this.processAlert(alert, userSettings);
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
    알림 생성/수정 직후 즉시 발송 체크용
    - notifyDate가 오늘이거나 이미 지난 경우, 다음날 크론을 기다리지 않고 바로 처리
      (오전 9시 이후에 당일 알림을 설정하면 그날 크론은 이미 지나가서,
       다음날 크론 때까지 밀렸다가 D+1로 잘못 표시되는 문제 방지)
    - 아직 발송 대상이 아니면(notifyDate가 미래) 아무것도 하지 않고 크론에 맡김
  */
  async dispatchIfDueNow(alertId: string): Promise<void> {
    const today = new Date();
    const alert = await this.documentAlertRepo.findOne({
      where: { alertId, isSent: false, notifyDate: LessThanOrEqual(today) },
      relations: { document: true, user: true },
    });

    if (!alert || alert.document == null) return;

    const userSettings = await this.userSettingsRepo.findOne({
      where: { userId: alert.userId },
    });

    try {
      await this.processAlert(alert, userSettings);
    } catch (err) {
      this.logger.error(
        `알림 즉시 발송 실패 (alertId=${alertId})`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /*
     개별 알림 처리
  1) notifications 피드 기록
  2) FCM으로 푸시 발송 (앱/웹 채널 둘 중 하나라도 켜져있으면)
  3) document_alerts 발송 완료 처리
  */
  private async processAlert(
    alert: DocumentAlert,
    userSettings: UserSettings | null,
  ): Promise<void> {
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
    // - 알림별 채널 설정(channelAppPush/channelWebPush) AND 유저 전역 설정(pushEnabled) 모두 켜져야 발송
    const pushEnabled = userSettings?.pushEnabled ?? true;
    if (pushEnabled && (alert.channelAppPush || alert.channelWebPush)) {
      await this.sendFcmPush(
        alert.userId,
        title,
        body,
        alert.documentId,
        alert.channelAppPush,
        alert.channelWebPush,
      );
    }

    // 3) 이메일 발송
    // - 알림별 채널 설정(channelEmail) AND 유저 전역 설정(emailNotiEnabled) 모두 켜져야 발송
    const emailEnabled = userSettings?.emailNotiEnabled ?? true;
    if (emailEnabled && alert.channelEmail && alert.user?.email) {
      await this.nodeMailer.sendAlertEmail({
        to: alert.user.email,
        subject: title,
        html: this.nodeMailer.buildAlertEmailHtml(title, alert.reason, alert.notifyDate, alert.documentId),
      });
    }

    // 4) 모든 채널 처리 완료 후 발송 완료 표시
    await this.documentAlertRepo.update(
      { alertId: alert.alertId },
      { isSent: true, sentAt: new Date() },
    );
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
