import { AiStatus } from '../../global/constants/aiStatus.enum';
import { CreateDocumentDto } from '../dto/createDocument.dto';
import { UpdateDocumentDto } from '../dto/updateDocument.dto';
import { GetDocumentsQueryDto } from '../dto/getDocumentsQuery.dto';
import { Document } from '../entities/document.entity';

export interface DocumentRepository {
  createDocument(
    input: CreateDocumentDto & {
      userId: string;
      aiStatus?: AiStatus;
      isConfirmed?: boolean;
    },
  ): Promise<Document>;
  findByDocumentIdAndUserId(
    documentId: string,
    userId: string,
    loadRelations?: boolean,
  ): Promise<Document | null>;
  findDocumentsByUserIdWithFilters(
    userId: string,
    query: GetDocumentsQueryDto,
  ): Promise<[Document[], number]>;
  updateDocumentByUserId(
    documentId: string,
    userId: string,
    dto: UpdateDocumentDto,
  ): Promise<Document | null>;
  setFavoriteByUserId(
    documentId: string,
    userId: string,
    isFavorite: boolean,
  ): Promise<Document | null>;
  findAiStatusByDocumentId(
    documentId: string,
    userId: string,
  ): Promise<{ documentId: string; aiStatus: AiStatus } | null>;
  updateTitleIfEmpty(documentId: string, title: string): Promise<void>;
}
