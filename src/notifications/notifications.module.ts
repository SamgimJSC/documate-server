import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { Notification } from './entities/notification.entity';
import { DeviceToken } from './entities/device-token.entity';
import { TypeOrmNotificationRepository } from './model/notification.repository';
import { TypeOrmDeviceTokenRepository } from './model/device-token.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, DeviceToken])],
  controllers: [NotificationsController],
  exports: [TypeOrmModule, NotificationsService],
  providers: [
    NotificationsService,
    TypeOrmNotificationRepository,
    TypeOrmDeviceTokenRepository,
  ],
})
export class NotificationsModule {}
