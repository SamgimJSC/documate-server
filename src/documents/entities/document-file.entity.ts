import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Document } from './document.entity';

@Entity('document_files')
export class DocumentFile {
  @PrimaryGeneratedColumn('increment', { name: 'file_id' })
  fileId: number;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ name: 'page_no', type: 'smallint' })
  pageNo: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Document, (document) => document.files)
  @JoinColumn({ name: 'document_id' })
  document: Document;
}
