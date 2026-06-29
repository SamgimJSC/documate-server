import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { FileType } from '../../global/constants/fileType.enum';
import { AiStatus } from '../../global/constants/aiStatus.enum';
import { User } from '../../users/entities/user.entity';
import { DocumentCategory } from './document-category.entity';
import { DocumentTag } from './document-tag.entity';
import { DocumentFile } from './document-file.entity';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid', { name: 'document_id' })
  documentId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'category_id', type: 'integer', nullable: true })
  categoryId: number | null;

  @Column({ name: 'title', type: 'varchar', length: 200, default: '' })
  title: string;

  @Column({ name: 'file_type', type: 'enum', enum: FileType, nullable: true })
  fileType: FileType | null;

  @Column({ name: 'file_size_bytes', type: 'bigint', default: 0 })
  fileSizeBytes: string;

  @Column({ name: 'page_count', type: 'smallint', nullable: true })
  pageCount: number | null;

  @Column({ name: 'ocr_text', type: 'text', nullable: true })
  ocrText: string | null;

  @Column({ name: 'extracted_data', type: 'jsonb', nullable: true })
  extractedData: Record<string, any> | null;

  @Column({
    name: 'ai_confidence',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  aiConfidence: number | null;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate: Date | null;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate: Date | null;

  @Column({ name: 'renewal_date', type: 'date', nullable: true })
  renewalDate: Date | null;

  @Column({ name: 'is_masked', type: 'boolean', default: false })
  isMasked: boolean;

  @Column({ name: 'is_favorite', type: 'boolean', default: false })
  isFavorite: boolean;

  @Column({
    name: 'ai_status',
    type: 'enum',
    enum: AiStatus,
    default: AiStatus.PENDING,
  })
  aiStatus: AiStatus;

  @Column({ name: 'is_confirmed', type: 'boolean', default: false })
  isConfirmed: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => DocumentCategory)
  @JoinColumn({ name: 'category_id' })
  category: DocumentCategory;

  @OneToMany(() => DocumentTag, (dt) => dt.document)
  documentTags: DocumentTag[];

  @OneToMany(() => DocumentFile, (df) => df.document)
  documentFiles: DocumentFile[];
}
