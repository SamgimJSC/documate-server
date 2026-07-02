import { TempFile } from '../entities/temp-file.entity';

export interface TempFileRepository {
  insert(input: {
    tempDocumentId: string;
    fileUrl: string;
    pageNo: number;
    fileSizeBytes: string;
  }): Promise<TempFile>;

  countByTempDocumentId(tempDocumentId: string): Promise<number>;
  existsByTempDocumentIdAndPageNo(
    tempDocumentId: string,
    pageNo: number,
  ): Promise<boolean>;
  findByTempDocumentId(tempDocumentId: string): Promise<TempFile[]>;
  findByIdAndTempDocumentId(id: string, tempDocumentId: string): Promise<TempFile | null>;
  deleteById(id: string): Promise<void>;
  deleteByTempDocumentId(tempDocumentId: string): Promise<void>;
  reorderPages(
    tempDocumentId: string,
    orderedFileIds: string[],
  ): Promise<void>;
}
