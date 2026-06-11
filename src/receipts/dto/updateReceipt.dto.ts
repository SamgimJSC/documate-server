import { InputMethod } from '../../global/constants/inputMethod.enum';
import { AiStatus } from '../../global/constants/aiStatus.enum';

export class UpdateReceiptDto {
  spendCategoryId?: number | null;
  inputMethod?: InputMethod;
  fileUrl?: string | null;
  storeName?: string;
  storeAddress?: string | null;
  totalAmount?: number;
  purchaseDate?: Date;
  paymentItem?: string | null;
  memo?: string | null;
  ocrText?: string | null;
  extractedData?: Record<string, any> | null;
  aiStatus?: AiStatus;
  isConfirmed?: boolean;
}
