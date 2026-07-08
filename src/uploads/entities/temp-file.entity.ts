import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TempDocument } from './temp-document.entity';

// synchronize: false 환경에서는 아래 제약을 마이그레이션으로 적용해야 합니다.
// ALTER TABLE temp_files ADD CONSTRAINT uq_temp_files_doc_page UNIQUE (temp_document_id, page_no);
@Entity('temp_files')
@Index(['tempDocumentId', 'pageNo'], { unique: true })
export class TempFile {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'temp_document_id', type: 'uuid' })
  tempDocumentId: string;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ name: 'page_no', type: 'smallint' })
  pageNo: number;

  @Column({ name: 'file_size_bytes', type: 'bigint', default: 0 })
  fileSizeBytes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => TempDocument, (td) => td.tempFiles)
  @JoinColumn({ name: 'temp_document_id' })
  tempDocument: TempDocument;
}
