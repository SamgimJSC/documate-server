import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DocumentTag } from '../entities/document-tag.entity';
import { DocumentTagRepository } from './document-tag.interface';

@Injectable()
export class TypeOrmDocumentTagRepository implements DocumentTagRepository {
  constructor(
    @InjectRepository(DocumentTag)
    private readonly repo: Repository<DocumentTag>,
  ) {}

  async addTag(documentId: string, tagId: string): Promise<DocumentTag> {
    const documentTag = this.repo.create({ documentId, tagId });
    return this.repo.save(documentTag);
  }

  async removeTag(documentId: string, tagId: string): Promise<boolean> {
    const result = await this.repo.delete({ documentId, tagId });
    return (result.affected ?? 0) > 0;
  }

  async findByDocumentId(documentId: string): Promise<DocumentTag[]> {
    return this.repo.find({ where: { documentId }, relations: { tag: true } });
  }

  async findByTagId(tagId: string): Promise<DocumentTag[]> {
    return this.repo.find({ where: { tagId }, relations: { document: true } });
  }

  async existsByDocumentIdAndTagId(
    documentId: string,
    tagId: string,
  ): Promise<boolean> {
    const count = await this.repo.count({ where: { documentId, tagId } });
    return count > 0;
  }
}
