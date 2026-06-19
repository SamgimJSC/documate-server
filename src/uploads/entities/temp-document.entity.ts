import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { TempFile } from './temp-file.entity';
import { AiStatus } from '../../global/constants/aiStatus.enum';

@Entity('temp_documents')
export class TempDocument {
  @PrimaryGeneratedColumn('uuid', { name: 'temp_document_id' })
  tempDocumentId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'ai_status',
    type: 'enum',
    enum: AiStatus,
    default: AiStatus.PENDING,
  })
  aiStatus: AiStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => TempFile, (tf) => tf.tempDocument)
  tempFiles: TempFile[];
}
