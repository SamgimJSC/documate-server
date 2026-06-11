import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationCategory } from '../../global/constants/notificationCategory.enum';
import { User } from '../../users/entities/user.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid', { name: 'notification_id' })
  notificationId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId: string | null;

  @Column({ name: 'category', type: 'enum', enum: NotificationCategory })
  category: NotificationCategory;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'body', type: 'varchar', length: 300, nullable: true })
  body: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'sent_at', type: 'timestamptz', default: () => 'now()' })
  sentAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
