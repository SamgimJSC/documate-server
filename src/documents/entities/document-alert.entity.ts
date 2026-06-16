import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AlertOffsetType } from '../../global/constants/alertOffsetType.enum';
import { Document } from './document.entity';
import { User } from '../../users/entities/user.entity';

@Entity('document_alerts')
export class DocumentAlert {
  @PrimaryGeneratedColumn('uuid', { name: 'alert_id' })
  alertId: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'offset_type', type: 'enum', enum: AlertOffsetType })
  offsetType: AlertOffsetType;

  @Column({ name: 'notify_date', type: 'date' })
  notifyDate: Date;

  @Column({ name: 'reason', type: 'varchar', length: 300, nullable: true })
  reason: string | null;

  @Column({ name: 'channel_email', type: 'boolean', default: false })
  channelEmail: boolean;

  @Column({ name: 'channel_web_push', type: 'boolean', default: false })
  channelWebPush: boolean;

  @Column({ name: 'is_sent', type: 'boolean', default: false })
  isSent: boolean;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
