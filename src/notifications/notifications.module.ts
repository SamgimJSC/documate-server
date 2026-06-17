import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { TypeOrmNotificationRepository } from './model/notification.repository';
import { TypeOrmDeviceTokenRepository } from './model/device-token.repository';
import { AuthModule } from '../auth/auth.module';
import { FcmService } from './providers/fcm.service';
import { TypedConfigService } from '../configs/typedConfig.service';
import { NotificationScheduler } from './notification.scheduler';
import { DocumentAlert } from '../documents/entities/document-alert.entity';

/*
  알림 모듈

  - TypeOrmModule.forFeature: 이 모듈에서 다룰 엔티티 등록
    - Notification, DeviceToken: 알림 모듈 소유
    - DocumentAlert: 스케줄러에서 읽기 위해 등록 (documents 모듈 소유지만,
      TypeORM은 같은 엔티티 메타데이터를 공유하므로 충돌 없음)
  - AuthModule: JwtAuthGuard 사용 위해 import
  - FcmService: Firebase 푸시 발송 담당
  - NotificationScheduler: 매일 정해진 시각에 자동 발송
*/
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, DeviceToken, DocumentAlert]),
    AuthModule,
  ],
  controllers: [NotificationsController],
  exports: [TypeOrmModule, NotificationsService, FcmService],
  providers: [
    NotificationsService,
    TypeOrmNotificationRepository,
    TypeOrmDeviceTokenRepository,
    FcmService,
    TypedConfigService,
    NotificationScheduler,
  ],
})
export class NotificationsModule {}
