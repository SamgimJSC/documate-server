import { DocumentCategory } from '../entities/document-category.entity';
import { UpdateDocumentCategoryDto } from '../dto/updateDocumentCategory.dto';

export interface DocumentCategoryRepository {
  findAll(): Promise<DocumentCategory[]>;
  findById(categoryId: number): Promise<DocumentCategory | null>;
  updateById(categoryId: number, dto: UpdateDocumentCategoryDto): Promise<DocumentCategory | null>;
}
