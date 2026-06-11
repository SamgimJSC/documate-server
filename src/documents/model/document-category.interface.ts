import { DocumentCategory } from '../entities/document-category.entity';

export interface DocumentCategoryRepository {
  findAll(): Promise<DocumentCategory[]>;
  findById(categoryId: number): Promise<DocumentCategory | null>;
}
