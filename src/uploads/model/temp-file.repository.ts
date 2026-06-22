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

  async setPageOrders(
    tempDocumentId: string,
    files: { id: string; pageNo: number }[],
  ): Promise<void> {
    await this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(TempFile);

      for (const f of files) {
        await repo.update({ id: f.id, tempDocumentId }, { pageNo: -f.pageNo });
      }

      for (const f of files) {
        await repo.update({ id: f.id, tempDocumentId }, { pageNo: f.pageNo });
      }
    });
  }

  /**
   * orderedFileIds 의 순서대로 page_no 를 1부터 다시 부여한다.
   * (temp_document_id, page_no) UNIQUE 제약 충돌을 피하기 위해
   * 트랜잭션 안에서 임시 음수값으로 옮긴 뒤 최종값을 부여한다(2-phase).
   */
  async reorderPages(
    tempDocumentId: string,
    orderedFileIds: string[],
  ): Promise<void> {
    await this.repo.manager.transaction(async (manager) => {
      const repo = manager.getRepository(TempFile);

      for (let i = 0; i < orderedFileIds.length; i++) {
        await repo.update(
          { id: orderedFileIds[i], tempDocumentId },
          { pageNo: -(i + 1) },
        );
      }

      for (let i = 0; i < orderedFileIds.length; i++) {
        await repo.update(
          { id: orderedFileIds[i], tempDocumentId },
          { pageNo: i + 1 },
        );
      }
    });
  }
}
