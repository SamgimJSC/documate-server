import { TempDocument } from '../entities/temp-document.entity';

export interface TempDocumentRepository {
  insert(userId: string): Promise<TempDocument>;
  findById(tempDocumentId: string): Promise<TempDocument | null>;
}
