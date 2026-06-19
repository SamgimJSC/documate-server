import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DocumentCategory } from '../entities/document-category.entity';
import { DocumentCategoryRepository } from './document-category.interface';
import { UpdateDocumentCategoryDto } from '../dto/updateDocumentCategory.dto';

@Injectable()
export class TypeOrmDocumentCategoryRepository implements DocumentCategoryRepository {
  constructor(
    @InjectRepository(DocumentCategory)
    private readonly repo: Repository<DocumentCategory>,
  ) {}

  async findAll(): Promise<DocumentCategory[]> {
    return this.repo.find();
  }

  async findById(categoryId: number): Promise<DocumentCategory | null> {
    return this.repo.findOne({ where: { categoryId } });
  }

  async updateById(categoryId: number, dto: UpdateDocumentCategoryDto): Promise<DocumentCategory | null> {
    const category = await this.findById(categoryId);
    if (!category) return null;

    Object.assign(category, dto);
    return this.repo.save(category);
  }
}
