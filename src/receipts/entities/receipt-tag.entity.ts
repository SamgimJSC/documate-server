import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Receipt } from './receipt.entity';
import { Tag } from '../../documents/entities/tag.entity';

@Entity('receipt_tags')
export class ReceiptTag {
  @PrimaryColumn({ name: 'receipt_id', type: 'uuid' })
  receiptId: string;

  @PrimaryColumn({ name: 'tag_id', type: 'uuid' })
  tagId: string;

  @ManyToOne(() => Receipt)
  @JoinColumn({ name: 'receipt_id' })
  receipt: Receipt;

  @ManyToOne(() => Tag)
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
