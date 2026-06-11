import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from '../entities/notification.entity';
import { NotificationRepository } from './notification.interface';
import { CreateNotificationDto } from '../dto/createNotification.dto';

@Injectable()
export class TypeOrmNotificationRepository implements NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.repo.create(dto);
    return this.repo.save(notification);
  }

  async findByUserId(userId: string): Promise<Notification[]> {
    return this.repo.find({
      where: { userId },
      order: { sentAt: 'DESC' },
    });
  }

  async findByNotificationId(
    notificationId: string,
  ): Promise<Notification | null> {
    return this.repo.findOne({ where: { notificationId } });
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    const result = await this.repo.update({ notificationId }, { isRead: true });
    return (result.affected ?? 0) > 0;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    const result = await this.repo.update({ userId, isRead: false }, { isRead: true });
    return (result.affected ?? 0) > 0;
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    const result = await this.repo.delete({ notificationId });
    return (result.affected ?? 0) > 0;
  }
}
