import { CreateDocumentFileDto } from '../dto/createDocumentFile.dto';
import { DocumentFile } from '../entities/document-file.entity';

export interface DocumentFileRepository {
  createDocumentFile(dto: CreateDocumentFileDto): Promise<DocumentFile>;
  findByFileId(fileId: number): Promise<DocumentFile | null>;
  findByDocumentId(documentId: string): Promise<DocumentFile[]>;
  deleteDocumentFile(fileId: number): Promise<boolean>;
}
