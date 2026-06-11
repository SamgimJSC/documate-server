import { CreateNotificationDto } from '../dto/createNotification.dto';
import { Notification } from '../entities/notification.entity';

export interface NotificationRepository {
  createNotification(dto: CreateNotificationDto): Promise<Notification>;
  findByUserId(userId: string): Promise<Notification[]>;
  findByNotificationId(notificationId: string): Promise<Notification | null>;
  markAsRead(notificationId: string): Promise<boolean>;
  markAllAsRead(userId: string): Promise<boolean>;
  deleteNotification(notificationId: string): Promise<boolean>;
}
