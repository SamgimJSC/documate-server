import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Receipt } from '../entities/receipt.entity';
import { ReceiptRepository } from './receipt.interface';
import { CreateReceiptDto } from '../dto/createReceipt.dto';
import { UpdateReceiptDto } from '../dto/updateReceipt.dto';

@Injectable()
export class TypeOrmReceiptRepository implements ReceiptRepository {
  constructor(
    @InjectRepository(Receipt)
    private readonly repo: Repository<Receipt>,
  ) {}

  async createReceipt(dto: CreateReceiptDto): Promise<Receipt> {
    const receipt = this.repo.create(dto);
    return this.repo.save(receipt);
  }

  async findByReceiptId(receiptId: string): Promise<Receipt | null> {
    return this.repo.findOne({ where: { receiptId, isDeleted: false } });
  }

  async findByUserId(userId: string): Promise<Receipt[]> {
    return this.repo.find({ where: { userId, isDeleted: false } });
  }

  async updateReceipt(
    receiptId: string,
    dto: UpdateReceiptDto,
  ): Promise<Receipt | null> {
    const receipt = await this.findByReceiptId(receiptId);
    if (!receipt) return null;

    Object.assign(receipt, dto);
    return this.repo.save(receipt);
  }

  async softDeleteReceipt(receiptId: string): Promise<boolean> {
    const receipt = await this.findByReceiptId(receiptId);
    if (!receipt) return false;

    receipt.isDeleted = true;
    await this.repo.save(receipt);
    return true;
  }
}
