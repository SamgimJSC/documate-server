import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { TempDocument } from '../entities/temp-document.entity';
import { TempFile } from '../entities/temp-file.entity';
import { TempDocumentRepository } from './temp-document.interface';
import { AiStatus } from '../../global/constants/aiStatus.enum';

@Injectable()
export class TypeOrmTempDocumentRepository implements TempDocumentRepository {
  constructor(
    @InjectRepository(TempDocument)
    private readonly repo: Repository<TempDocument>,
    @InjectRepository(TempFile)
    private readonly tempFileRepo: Repository<TempFile>,
  ) {}

  async insert(userId: string): Promise<TempDocument> {
    const doc = this.repo.create({ userId });
    return this.repo.save(doc);
  }

  async findById(tempDocumentId: string): Promise<TempDocument | null> {
    return this.repo.findOne({ where: { tempDocumentId } });
  }

  async findByUserId(userId: string): Promise<TempDocument[]> {
    return this.repo.find({
      where: { userId },
      relations: { tempFiles: true },
      order: { createdAt: 'DESC', tempFiles: { pageNo: 'ASC' } },
    });
  }

  async updateAiStatus(
    tempDocumentId: string,
    aiStatus: AiStatus,
  ): Promise<void> {
    await this.repo.update({ tempDocumentId }, { aiStatus });
  }

  async deleteExpired(days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const expired = await this.repo
      .createQueryBuilder('td')
      .select('td.tempDocumentId')
      .where('td.createdAt < :cutoff', { cutoff })
      .andWhere('td.aiStatus != :status', { status: AiStatus.FAILED })
      .getMany();

    if (expired.length === 0) return 0;

    const ids = expired.map((d) => d.tempDocumentId);
    await this.tempFileRepo.delete({ tempDocumentId: In(ids) });
    await this.repo.delete(ids);

    return ids.length;
  }

  async deleteById(tempDocumentId: string): Promise<void> {
    await this.repo.delete({ tempDocumentId });
  }

  async markStaleAsFailed(
    pendingTimeoutMinutes: number,
    processingTimeoutMinutes: number,
  ): Promise<number> {
    const pendingCutoff = new Date(
      Date.now() - pendingTimeoutMinutes * 60 * 1000,
    );
    const processingCutoff = new Date(
      Date.now() - processingTimeoutMinutes * 60 * 1000,
    );

    const result = await this.repo
      .createQueryBuilder()
      .update(TempDocument)
      .set({ aiStatus: AiStatus.FAILED })
      .where(
        '(ai_status = :pending AND created_at < :pendingCutoff) OR (ai_status = :processing AND created_at < :processingCutoff)',
        {
          pending: AiStatus.PENDING,
          pendingCutoff,
          processing: AiStatus.PROCESSING,
          processingCutoff,
        },
      )
      .execute();

    return result.affected ?? 0;
  }
}
