import { TempDocument } from '../entities/temp-document.entity';
import { AiStatus } from '../../global/constants/aiStatus.enum';

export interface TempDocumentRepository {
  insert(userId: string): Promise<TempDocument>;
  findById(tempDocumentId: string): Promise<TempDocument | null>;
  findByUserId(userId: string): Promise<TempDocument[]>;
  updateAiStatus(tempDocumentId: string, aiStatus: AiStatus): Promise<void>;
  deleteExpired(days: number): Promise<number>;
  deleteById(tempDocumentId: string): Promise<void>;
}
