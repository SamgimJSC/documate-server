import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DocumentFile } from '../entities/document-file.entity';
import { DocumentFileRepository } from './document-file.interface';
import { CreateDocumentFileDto } from '../dto/createDocumentFile.dto';

@Injectable()
export class TypeOrmDocumentFileRepository implements DocumentFileRepository {
  constructor(
    @InjectRepository(DocumentFile)
    private readonly repo: Repository<DocumentFile>,
  ) {}

  async createDocumentFile(dto: CreateDocumentFileDto): Promise<DocumentFile> {
    const file = this.repo.create(dto);
    return this.repo.save(file);
  }

  async findByFileId(fileId: number): Promise<DocumentFile | null> {
    return this.repo.findOne({ where: { fileId } });
  }

  async findByDocumentId(documentId: string): Promise<DocumentFile[]> {
    return this.repo.find({
      where: { documentId },
      order: { pageNo: 'ASC' },
    });
  }

  async deleteDocumentFile(fileId: number): Promise<boolean> {
    const result = await this.repo.delete(fileId);
    return (result.affected ?? 0) > 0;
  }
}
