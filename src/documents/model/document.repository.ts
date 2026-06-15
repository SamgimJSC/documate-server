import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Document } from '../entities/document.entity';
import { DocumentRepository } from './document.interface';
import { CreateDocumentDto } from '../dto/createDocument.dto';
import { UpdateDocumentDto } from '../dto/updateDocument.dto';

@Injectable()
export class TypeOrmDocumentRepository implements DocumentRepository {
  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
  ) {}

  async createDocument(dto: CreateDocumentDto): Promise<Document> {
    const document = this.repo.create(dto);
    return this.repo.save(document);
  }

  async findByDocumentId(documentId: string): Promise<Document | null> {
    return this.repo.findOne({
      where: { documentId, isDeleted: false },
      relations: { files: true },
    });
  }

  async findByUserId(userId: string): Promise<Document[]> {
    return this.repo.find({
      where: { userId, isDeleted: false },
      relations: { files: true },
    });
  }

  async updateDocument(
    documentId: string,
    dto: UpdateDocumentDto,
  ): Promise<Document | null> {
    const document = await this.findByDocumentId(documentId);
    if (!document) return null;

    Object.assign(document, dto);
    return this.repo.save(document);
  }

  async softDeleteDocument(documentId: string): Promise<boolean> {
    const document = await this.findByDocumentId(documentId);
    if (!document) return false;

    document.isDeleted = true;
    await this.repo.save(document);
    return true;
  }
}
