import { CreateDocumentActivityDto } from '../dto/createDocumentActivity.dto';
import { DocumentActivity } from '../entities/document-activity.entity';

export interface DocumentActivityRepository {
  createActivity(dto: CreateDocumentActivityDto): Promise<DocumentActivity>;
  findByDocumentId(documentId: string): Promise<DocumentActivity[]>;
}
