import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { DocumentCategoryCode } from '../../global/constants/documentCategoryCode.enum';

@Entity('document_categories')
export class DocumentCategory {
  @PrimaryGeneratedColumn('increment', { name: 'category_id' })
  categoryId: number;

  @Column({
    name: 'code',
    type: 'enum',
    enum: DocumentCategoryCode,
    unique: true,
  })
  code: DocumentCategoryCode;

  @Column({ name: 'name', type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({
    name: 'default_notify_offset_days',
    type: 'integer',
    nullable: true,
  })
  defaultNotifyOffsetDays: number | null;

  @Column({ name: 'is_secured', type: 'boolean', default: false })
  isSecured: boolean;

  @Column({ name: 'description', type: 'varchar', length: 200, nullable: true })
  description: string | null;
}
