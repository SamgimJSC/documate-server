import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { TempFile } from './temp-file.entity';

@Entity('temp_documents')
export class TempDocument {
  @PrimaryGeneratedColumn('uuid', { name: 'temp_document_id' })
  tempDocumentId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => TempFile, (tf) => tf.tempDocument)
  tempFiles: TempFile[];
}
