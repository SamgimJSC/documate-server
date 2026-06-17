import { Module } from '@nestjs/common';

import { SpendCategoriesController } from './spend-categories.controller';
import { SpendCategoriesService } from './spend-categories.service';
import { ReceiptsModule } from '../receipts/receipts.module';
import { AuthModule } from '../auth/auth.module';

/*
  소비 카테고리 모듈
  - SpendCategory 엔티티와 Repository는 receipts 모듈 소유
    → ReceiptsModule을 import해서 그쪽 provider 활용
*/
@Module({
  imports: [ReceiptsModule, AuthModule],
  controllers: [SpendCategoriesController],
  providers: [SpendCategoriesService],
})
export class SpendCategoriesModule {}