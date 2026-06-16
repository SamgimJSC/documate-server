import { DocumentFile } from '../entities/document-file.entity';

export interface DocumentFileRepository {
  insert(input: {
    documentId: string;
    fileUrl: string;
    pageNo: number;
  }): Promise<DocumentFile>;

  countByDocumentId(documentId: string): Promise<number>;

  existsByDocumentIdAndPageNo(
    documentId: string,
    pageNo: number,
  ): Promise<boolean>;

  findByDocumentId(documentId: string): Promise<DocumentFile[]>;

  findByFileIdAndDocumentId(
    fileId: number,
    documentId: string,
  ): Promise<DocumentFile | null>;

  updatePageNo(fileId: number, pageNo: number): Promise<void>;
}
