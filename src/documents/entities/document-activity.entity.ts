import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DocumentActivityType } from '../../global/constants/documentActivityType.enum';
import { Document } from './document.entity';

@Entity('document_activities')
export class DocumentActivity {
  @PrimaryGeneratedColumn('uuid', { name: 'activity_id' })
  activityId: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({
    name: 'activity_type',
    type: 'enum',
    enum: DocumentActivityType,
  })
  activityType: DocumentActivityType;

  @Column({
    name: 'description',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Document)
  @JoinColumn({ name: 'document_id' })
  document: Document;
}
