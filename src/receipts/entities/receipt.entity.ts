import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { InputMethod } from '../../global/constants/inputMethod.enum';
import { AiStatus } from '../../global/constants/aiStatus.enum';
import { User } from '../../users/entities/user.entity';
import { SpendCategory } from './spend-category.entity';

@Entity('receipts')
export class Receipt {
  @PrimaryGeneratedColumn('uuid', { name: 'receipt_id' })
  receiptId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'spend_category_id', type: 'integer', nullable: true })
  spendCategoryId: number | null;

  @Column({ name: 'input_method', type: 'enum', enum: InputMethod })
  inputMethod: InputMethod;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string | null;

  @Column({ name: 'store_name', type: 'varchar', length: 100 })
  storeName: string;

  @Column({
    name: 'store_address',
    type: 'varchar',
    length: 300,
    nullable: true,
  })
  storeAddress: string | null;

  @Column({ name: 'total_amount', type: 'numeric', precision: 12, scale: 0 })
  totalAmount: number;

  @Column({ name: 'purchase_date', type: 'date' })
  purchaseDate: Date;

  @Column({
    name: 'payment_item',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  paymentItem: string | null;

  @Column({ name: 'memo', type: 'varchar', length: 300, nullable: true })
  memo: string | null;

  @Column({ name: 'ocr_text', type: 'text', nullable: true })
  ocrText: string | null;

  @Column({ name: 'extracted_data', type: 'jsonb', nullable: true })
  extractedData: Record<string, any> | null;

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

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => SpendCategory)
  @JoinColumn({ name: 'spend_category_id' })
  spendCategory: SpendCategory;
}
