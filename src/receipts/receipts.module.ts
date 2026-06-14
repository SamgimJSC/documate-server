import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { SpendCategory } from './entities/spend-category.entity';
import { Receipt } from './entities/receipt.entity';
import { ReceiptTag } from './entities/receipt-tag.entity';
import { MonthlyReport } from './entities/monthly-report.entity';
import { TypeOrmSpendCategoryRepository } from './model/spend-category.repository';
import { TypeOrmReceiptRepository } from './model/receipt.repository';
import { TypeOrmReceiptTagRepository } from './model/receipt-tag.repository';
import { TypeOrmMonthlyReportRepository } from './model/monthly-report.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SpendCategory,
      Receipt,
      ReceiptTag,
      MonthlyReport,
    ]),
    AuthModule, 
  ],
  controllers: [ReceiptsController],
  exports: [ReceiptsService],
  providers: [
    ReceiptsService,
    TypeOrmSpendCategoryRepository,
    TypeOrmReceiptRepository,
    TypeOrmReceiptTagRepository,
    TypeOrmMonthlyReportRepository,
  ],
})
export class ReceiptsModule {}