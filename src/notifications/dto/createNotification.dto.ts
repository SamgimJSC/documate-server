import { NotificationCategory } from '../../global/constants/notificationCategory.enum';

export class CreateNotificationDto {
  userId: string;
  documentId?: string | null;
  category: NotificationCategory;
  title: string;
  body?: string | null;
}
