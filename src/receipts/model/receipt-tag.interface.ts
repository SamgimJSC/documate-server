import { ReceiptTag } from '../entities/receipt-tag.entity';

export interface ReceiptTagRepository {
  addTag(receiptId: string, tagId: string): Promise<ReceiptTag>;
  removeTag(receiptId: string, tagId: string): Promise<boolean>;
  findByReceiptId(receiptId: string): Promise<ReceiptTag[]>;
}
