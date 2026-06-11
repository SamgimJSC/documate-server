import { CreateReceiptDto } from '../dto/createReceipt.dto';
import { UpdateReceiptDto } from '../dto/updateReceipt.dto';
import { Receipt } from '../entities/receipt.entity';

export interface ReceiptRepository {
  createReceipt(dto: CreateReceiptDto): Promise<Receipt>;
  findByReceiptId(receiptId: string): Promise<Receipt | null>;
  findByUserId(userId: string): Promise<Receipt[]>;
  updateReceipt(
    receiptId: string,
    dto: UpdateReceiptDto,
  ): Promise<Receipt | null>;
  softDeleteReceipt(receiptId: string): Promise<boolean>;
}
