import { Inject, Injectable } from '@nestjs/common';

import { TypeOrmReceiptRepository } from './model/receipt.repository';
import { type ReceiptRepository } from './model/receipt.interface';

@Injectable()
export class ReceiptsService {
  constructor(
    @Inject(TypeOrmReceiptRepository)
    private readonly receiptRepo: ReceiptRepository,
  ) {}
}