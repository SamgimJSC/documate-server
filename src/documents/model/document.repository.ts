import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Document } from '../entities/document.entity';
import { DocumentRepository } from './document.interface';
import { CreateDocumentDto } from '../dto/createDocument.dto';
import { UpdateDocumentDto } from '../dto/updateDocument.dto';
import { GetDocumentsQueryDto } from '../dto/getDocumentsQuery.dto';
import { AiStatus } from '../../global/constants/aiStatus.enum';
import {
  DOCUMENT_DEFAULT_PAGE,
  DOCUMENT_DEFAULT_LIMIT,
} from '../../global/constants/document-limit.const';

const ALLOWED_SORT = new Set(['createdAt', 'updatedAt', 'title', 'expiryDate']);

@Injectable()
export class TypeOrmDocumentRepository implements DocumentRepository {
  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
  ) {}

  async createDocument(
    input: CreateDocumentDto & {
      userId: string;
      aiStatus?: AiStatus;
      isConfirmed?: boolean;
    },
  ): Promise<Document> {
    const document = this.repo.create(input);
    return this.repo.save(document);
  }

  async findByDocumentIdAndUserId(
    documentId: string,
    userId: string,
    loadRelations = false,
  ): Promise<Document | null> {
    return this.repo.findOne({
      where: { documentId, userId },
      relations: loadRelations
        ? { category: true, documentTags: { tag: true }, documentFiles: true }
        : undefined,
    });
  }

  async findDocumentsByUserIdWithFilters(
    userId: string,
    query: GetDocumentsQueryDto,
  ): Promise<[Document[], number]> {
    const {
      keyword,
      searchField,
      categoryId,
      fileType,
      aiStatus,
      isFavorite,
      tagId,
      page = DOCUMENT_DEFAULT_PAGE,
      limit = DOCUMENT_DEFAULT_LIMIT,
      sort = 'createdAt',
      order = 'DESC',
    } = query;

    const sortColumn = ALLOWED_SORT.has(sort) ? sort : 'createdAt';
    const orderDirection = order === 'ASC' ? 'ASC' : ('DESC' as const);

    const qb = this.repo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.category', 'category')
      .leftJoinAndSelect('d.documentTags', 'dt')
      .leftJoinAndSelect('dt.tag', 'tag')
      .where('d.userId = :userId', { userId })

    if (keyword) {
      if (searchField === 'title') {
        qb.andWhere('d.title ILIKE :keyword', { keyword: `%${keyword}%` });
      } else if (searchField === 'ocr') {
        qb.andWhere('d.ocrText ILIKE :keyword', { keyword: `%${keyword}%` });
      } else if (searchField === 'tag') {
        qb.andWhere(
          `EXISTS (
            SELECT 1 FROM document_tags dt3
            JOIN tags t ON t.tag_id = dt3.tag_id
            WHERE dt3.document_id = d.document_id
            AND t.name ILIKE :keyword
          )`,
          { keyword: `%${keyword}%` },
        );
      } else {
        qb.andWhere(
          `(d.title ILIKE :keyword OR d.ocrText ILIKE :keyword OR EXISTS (
            SELECT 1 FROM document_tags dt3
            JOIN tags t ON t.tag_id = dt3.tag_id
            WHERE dt3.document_id = d.document_id
            AND t.name ILIKE :keyword
          ))`,
          { keyword: `%${keyword}%` },
        );
      }
    }

    if (categoryId !== undefined) {
      qb.andWhere('d.categoryId = :categoryId', { categoryId });
    }

    if (fileType !== undefined) {
      qb.andWhere('d.fileType = :fileType', { fileType });
    }

    if (aiStatus !== undefined) {
      qb.andWhere('d.aiStatus = :aiStatus', { aiStatus });
    }

    if (isFavorite !== undefined) {
      qb.andWhere('d.isFavorite = :isFavorite', { isFavorite });
    }

    if (tagId) {
      qb.andWhere(
        `EXISTS (
          SELECT 1 FROM document_tags dt2
          WHERE dt2.document_id = d.document_id
            AND dt2.tag_id = :tagId
        )`,
        { tagId },
      );
    }

    return qb
      .orderBy(`d.${sortColumn}`, orderDirection)
      .skip((page - 1) * limit)
      .take(limit)
      .distinct(true)
      .getManyAndCount();
  }

  async updateDocumentByUserId(
    documentId: string,
    userId: string,
    dto: UpdateDocumentDto,
  ): Promise<Document | null> {
    const document = await this.findByDocumentIdAndUserId(documentId, userId);
    if (!document) return null;

    Object.assign(document, dto);
    await this.repo.save(document);
    return this.findByDocumentIdAndUserId(documentId, userId, true);
  }

  async setFavoriteByUserId(
    documentId: string,
    userId: string,
    isFavorite: boolean,
  ): Promise<Document | null> {
    const document = await this.findByDocumentIdAndUserId(documentId, userId);
    if (!document) return null;

    document.isFavorite = isFavorite;
    return this.repo.save(document);
  }

  async findAiStatusByDocumentId(
    documentId: string,
    userId: string,
  ): Promise<{ documentId: string; aiStatus: AiStatus } | null> {
    const result = await this.repo.findOne({
      select: { documentId: true, aiStatus: true },
      where: { documentId, userId },
    });
    if (!result) return null;
    return { documentId: result.documentId, aiStatus: result.aiStatus };
  }

  async updateTitleIfEmpty(documentId: string, title: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Document)
      .set({ title })
      .where('document_id = :documentId AND title = :empty', {
        documentId,
        empty: '',
      })
      .execute();
  }
}
