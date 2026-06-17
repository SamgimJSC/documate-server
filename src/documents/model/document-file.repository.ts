import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentFile } from '../entities/document-file.entity';
import { DocumentFileRepository } from './document-file.interface';

@Injectable()
export class TypeOrmDocumentFileRepository implements DocumentFileRepository {
  constructor(
    @InjectRepository(DocumentFile)
    private readonly repo: Repository<DocumentFile>,
  ) {}

  async insert(input: {
    documentId: string;
    fileUrl: string;
    pageNo: number;
  }): Promise<DocumentFile> {
    const file = this.repo.create(input);
    return this.repo.save(file);
  }

  async countByDocumentId(documentId: string): Promise<number> {
    return this.repo.count({ where: { documentId } });
  }

  async existsByDocumentIdAndPageNo(
    documentId: string,
    pageNo: number,
  ): Promise<boolean> {
    const count = await this.repo.count({ where: { documentId, pageNo } });
    return count > 0;
  }

  async findByDocumentId(documentId: string): Promise<DocumentFile[]> {
    return this.repo.find({
      where: { documentId },
      order: { pageNo: 'ASC' },
    });
  }

  async findByFileIdAndDocumentId(
    fileId: number,
    documentId: string,
  ): Promise<DocumentFile | null> {
    return this.repo.findOne({ where: { fileId, documentId } });
  }

  async updatePageNo(fileId: number, pageNo: number): Promise<void> {
    await this.repo.update({ fileId }, { pageNo });
  }
}
