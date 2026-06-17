import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TempDocument } from '../entities/temp-document.entity';
import { TempDocumentRepository } from './temp-document.interface';

@Injectable()
export class TypeOrmTempDocumentRepository implements TempDocumentRepository {
  constructor(
    @InjectRepository(TempDocument)
    private readonly repo: Repository<TempDocument>,
  ) {}

  async insert(userId: string): Promise<TempDocument> {
    const doc = this.repo.create({ userId });
    return this.repo.save(doc);
  }

  async findById(tempDocumentId: string): Promise<TempDocument | null> {
    return this.repo.findOne({ where: { tempDocumentId } });
  }
}
