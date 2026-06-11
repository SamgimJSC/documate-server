import { AiStatus } from '../../global/constants/aiStatus.enum';
import { FileType } from '../../global/constants/fileType.enum';

export class CreateDocumentDto {
  userId: string;
  categoryId?: number | null;
  title: string;
  fileUrl: string;
  fileName: string;
  fileType?: FileType | null;
  fileSizeBytes?: string;
  pageCount?: number | null;
  ocrText?: string | null;
  extractedData?: Record<string, any> | null;
  aiConfidence?: number | null;
  issueDate?: Date | null;
  expiryDate?: Date | null;
  renewalDate?: Date | null;
  isMasked?: boolean;
  isFavorite?: boolean;
  aiStatus?: AiStatus;
  isConfirmed?: boolean;
}
