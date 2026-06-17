import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { TypeOrmReportsRepository } from './model/reports.repository';
import { Receipt } from '../receipts/entities/receipt.entity';
import { AuthModule } from '../auth/auth.module';

/*
  reports 모듈
  - 영수증 데이터를 집계해서 리포트로 반환
  - Receipt 엔티티는 receipts 모듈 소유지만, 집계 읽기 용도로
    forFeature 등록만 해서 사용 (TypeORM은 같은 엔티티 메타데이터를 공유)
  - AuthModule은 JwtAuthGuard 사용을 위해 필요
*/
@Module({
  imports: [
    TypeOrmModule.forFeature([Receipt]),
    AuthModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, TypeOrmReportsRepository],
})
export class ReportsModule {}