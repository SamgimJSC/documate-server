import { CreateDocumentDto } from '../dto/createDocument.dto';
import { UpdateDocumentDto } from '../dto/updateDocument.dto';
import { Document } from '../entities/document.entity';

export interface DocumentRepository {
  createDocument(dto: CreateDocumentDto): Promise<Document>;
  findByDocumentId(documentId: string): Promise<Document | null>;
  findByUserId(userId: string): Promise<Document[]>;
  updateDocument(
    documentId: string,
    dto: UpdateDocumentDto,
  ): Promise<Document | null>;
  softDeleteDocument(documentId: string): Promise<boolean>;
}
