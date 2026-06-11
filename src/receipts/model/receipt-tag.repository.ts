import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ReceiptTag } from '../entities/receipt-tag.entity';
import { ReceiptTagRepository } from './receipt-tag.interface';

@Injectable()
export class TypeOrmReceiptTagRepository implements ReceiptTagRepository {
  constructor(
    @InjectRepository(ReceiptTag)
    private readonly repo: Repository<ReceiptTag>,
  ) {}

  async addTag(receiptId: string, tagId: string): Promise<ReceiptTag> {
    const receiptTag = this.repo.create({ receiptId, tagId });
    return this.repo.save(receiptTag);
  }

  async removeTag(receiptId: string, tagId: string): Promise<boolean> {
    const result = await this.repo.delete({ receiptId, tagId });
    return (result.affected ?? 0) > 0;
  }

  async findByReceiptId(receiptId: string): Promise<ReceiptTag[]> {
    return this.repo.find({ where: { receiptId }, relations: { tag: true } });
  }
}
