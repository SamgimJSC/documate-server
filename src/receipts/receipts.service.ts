import { Inject, Injectable } from '@nestjs/common';

import { TypeOrmReceiptRepository } from './model/receipt.repository';
import { type ReceiptRepository } from './model/receipt.interface';
import { CreateReceiptRequestDto } from './dto/createReceiptRequest.dto';
import { Receipt } from './entities/receipt.entity';
import { AiStatus } from '../global/constants/aiStatus.enum';
import { InputMethod } from '../global/constants/inputMethod.enum';

@Injectable()
export class ReceiptsService {
  constructor(
    @Inject(TypeOrmReceiptRepository)
    private readonly receiptRepo: ReceiptRepository,
  ) {}

  async createReceipt(
    userId: string,
    dto: CreateReceiptRequestDto,
  ): Promise<Receipt> {
    return this.receiptRepo.createReceipt({
      ...dto,
      userId,
      purchaseDate: new Date(dto.purchaseDate),
      aiStatus: dto.inputMethod === InputMethod.OCR ? AiStatus.DONE : AiStatus.DONE,
      isConfirmed: dto.isConfirmed ?? true,
    });
  }
}