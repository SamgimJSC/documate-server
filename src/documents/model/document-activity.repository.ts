import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DocumentActivity } from '../entities/document-activity.entity';
import { DocumentActivityRepository } from './document-activity.interface';
import { CreateDocumentActivityDto } from '../dto/createDocumentActivity.dto';

@Injectable()
export class TypeOrmDocumentActivityRepository
  implements DocumentActivityRepository
{
  constructor(
    @InjectRepository(DocumentActivity)
    private readonly repo: Repository<DocumentActivity>,
  ) {}

  async createActivity(
    dto: CreateDocumentActivityDto,
  ): Promise<DocumentActivity> {
    const activity = this.repo.create(dto);
    return this.repo.save(activity);
  }

  async findByDocumentId(documentId: string): Promise<DocumentActivity[]> {
    return this.repo.find({
      where: { documentId },
      order: { createdAt: 'DESC' },
    });
  }
}
