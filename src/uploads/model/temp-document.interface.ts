import { TempDocument } from '../entities/temp-document.entity';
import { AiStatus } from '../../global/constants/aiStatus.enum';

export interface TempDocumentRepository {
  insert(userId: string): Promise<TempDocument>;
  findById(tempDocumentId: string): Promise<TempDocument | null>;
  findByUserId(userId: string): Promise<TempDocument[]>;
  updateAiStatus(tempDocumentId: string, aiStatus: AiStatus): Promise<void>;
  deleteExpired(days: number): Promise<number>;
  deleteById(tempDocumentId: string): Promise<void>;

  // PENDING/PROCESSING 으로 너무 오래 멈춰있는 건을 FAILED 로 전환한다.
  // 반환값: FAILED 로 전환된 건수.
  markStaleAsFailed(
    pendingTimeoutMinutes: number,
    processingTimeoutMinutes: number,
  ): Promise<number>;
}
