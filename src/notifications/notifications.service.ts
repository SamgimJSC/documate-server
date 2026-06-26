import { Inject, Injectable } from '@nestjs/common';

import { TypeOrmNotificationRepository } from './model/notification.repository';
import { type NotificationRepository } from './model/notification.interface';
import { TypeOrmDeviceTokenRepository } from './model/device-token.repository';
import { type DeviceTokenRepository } from './model/device-token.interface';
import { CreateNotificationBodyDto } from './dto/createNotificationBody.dto';
import { RegisterDeviceTokenDto } from './dto/registerDeviceToken.dto';
import { Notification } from './entities/notification.entity';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { ERROR_CODE } from '../global/constants/errorCode.const';

/*
  알림 비즈니스 로직 담당

  - 컨트롤러는 HTTP만 처리하고, "무엇을 할지"는 여기서 결정
  - Repository(DB 접근)는 인터페이스로 주입받음
*/
@Injectable()
export class NotificationsService {
  constructor(
    // 알림 테이블(notifications) 접근
    @Inject(TypeOrmNotificationRepository)
    private readonly notificationRepo: NotificationRepository,
    // 디바이스 토큰 테이블(device_tokens) 접근
    @Inject(TypeOrmDeviceTokenRepository)
    private readonly deviceTokenRepo: DeviceTokenRepository,
  ) {}

  // ====================================================================
  // 알림 피드 관련
  // ====================================================================

  /*
    내 알림 목록 조회 (최신순)
  */
  async getMyNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepo.findByUserId(userId);
  }

  /*
    알림 생성
    - userId는 토큰에서 받은 값 (컨트롤러가 넘겨줌)
    - 외부 입력 DTO(CreateNotificationBodyDto)에 userId를 합쳐서
      내부 DTO(CreateNotificationDto) 형태로 Repository에 전달
  */
  async createNotification(userId: string, dto: CreateNotificationBodyDto) {
    return this.notificationRepo.createNotification({ userId, ...dto });
  }

  /*
    알림 단건 읽음 처리 (본인 알림인지 검증)
  */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.getOwnedNotification(userId, notificationId);

    await this.notificationRepo.markAsRead(notificationId);
  }

  /*
    내 알림 전체 읽음 처리
  */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.markAllAsRead(userId);
  }

  /*
    알림 삭제 (본인 알림만 삭제 가능)
  */
  async removeNotification(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    await this.getOwnedNotification(userId, notificationId);

    await this.notificationRepo.deleteNotification(notificationId);
  }

  /*
    [내부 헬퍼] 알림이 존재하고 본인 소유인지 검증
    - 본인 게 아니면 일부러 NOT_FOUND로 응답 (남의 알림 존재 여부 추측 못하게)
  */
  private async getOwnedNotification(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const notification =
      await this.notificationRepo.findByNotificationId(notificationId);

    if (!notification || notification.userId !== userId) {
      throw new ENotFoundException({
        message: '알림을 찾을 수 없습니다.',
        errorCode: ERROR_CODE.NOTIFICATION_NOT_FOUND,
      });
    }

    return notification;
  }

  // ====================================================================
  // 디바이스 토큰 관련 (FCM 푸시 발송용)
  // ====================================================================

  /*
    디바이스 토큰 등록
    - 이미 이 유저의 활성 토큰이면 그대로 반환 (중복 저장 안 함)
    - 다른 유저 것이거나 비활성 상태 → 비활성화 후 현재 유저 것으로 새로 생성
      (기기 공유/이전 시 이전 유저에게 알림이 가는 것을 방지)
  */
  async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto) {
    const existing = await this.deviceTokenRepo.findByToken(dto.token);

    if (existing) {
      if (existing.userId === userId && existing.isActive) return existing;
      await this.deviceTokenRepo.deactivateToken(existing.tokenId);
    }

    return this.deviceTokenRepo.createToken({ userId, ...dto });
  }

  /*
    디바이스 토큰 해제 (로그아웃 시 등)
    - 실제 삭제가 아니라 is_active=false로 비활성화 (이력 보존)
    - 본인 토큰인지 검증
  */
  async removeDeviceToken(userId: string, tokenId: string): Promise<void> {
    const userTokens = await this.deviceTokenRepo.findByUserId(userId);
    const target = userTokens.find((t) => t.tokenId === tokenId);

    if (!target) {
      throw new ENotFoundException({
        message: '디바이스 토큰을 찾을 수 없습니다.',
        errorCode: ERROR_CODE.DEVICE_TOKEN_NOT_FOUND,
      });
    }

    await this.deviceTokenRepo.deactivateToken(tokenId);
  }
}
