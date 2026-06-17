import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TempFile } from '../entities/temp-file.entity';
import { TempFileRepository } from './temp-file.interface';

@Injectable()
export class TypeOrmTempFileRepository implements TempFileRepository {
  constructor(
    @InjectRepository(TempFile)
    private readonly repo: Repository<TempFile>,
  ) {}

  async insert(input: {
    tempDocumentId: string;
    fileUrl: string;
    pageNo: number;
  }): Promise<TempFile> {
    const file = this.repo.create(input);
    return this.repo.save(file);
  }

  async countByTempDocumentId(tempDocumentId: string): Promise<number> {
    return this.repo.count({ where: { tempDocumentId } });
  }

  async existsByTempDocumentIdAndPageNo(
    tempDocumentId: string,
    pageNo: number,
  ): Promise<boolean> {
    const count = await this.repo.count({ where: { tempDocumentId, pageNo } });
    return count > 0;
  }

  async findByTempDocumentId(tempDocumentId: string): Promise<TempFile[]> {
    return this.repo.find({
      where: { tempDocumentId },
      order: { pageNo: 'ASC' },
    });
  }
}
