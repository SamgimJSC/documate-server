import { Module } from '@nestjs/common';

import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { AdminModule } from '../admin/admin.module';
import { ReceiptsModule } from '../receipts/receipts.module';
import { AuthModule } from '../auth/auth.module';

/*
  카드 추천 API 모듈 (클라이언트 대면)
  - AdminModule: Card / CardRecommendation 리포지토리 재사용
  - ReceiptsModule: 영수증 존재 여부 조회
  - AuthModule: JwtAuthGuard
  - REDIS_CLIENT 는 전역(RedisModule)에서 주입
*/
@Module({
  imports: [AdminModule, ReceiptsModule, AuthModule],
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}
