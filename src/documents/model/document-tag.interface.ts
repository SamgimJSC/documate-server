import { DocumentTag } from '../entities/document-tag.entity';

export interface DocumentTagRepository {
  addTag(documentId: string, tagId: string): Promise<DocumentTag>;
  removeTag(documentId: string, tagId: string): Promise<boolean>;
  findByDocumentId(documentId: string): Promise<DocumentTag[]>;
  findByTagId(tagId: string): Promise<DocumentTag[]>;
  existsByDocumentIdAndTagId(
    documentId: string,
    tagId: string,
  ): Promise<boolean>;
}
