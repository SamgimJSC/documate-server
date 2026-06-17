import { TempFile } from '../entities/temp-file.entity';

export interface TempFileRepository {
  insert(input: {
    tempDocumentId: string;
    fileUrl: string;
    pageNo: number;
  }): Promise<TempFile>;

  countByTempDocumentId(tempDocumentId: string): Promise<number>;
  existsByTempDocumentIdAndPageNo(
    tempDocumentId: string,
    pageNo: number,
  ): Promise<boolean>;
  findByTempDocumentId(tempDocumentId: string): Promise<TempFile[]>;
}
