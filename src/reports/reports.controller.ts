import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { ReportsService } from './reports.service';
import { GetReportQueryDto } from './dto/getReportQuery.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DecoUser } from '../global/decorators/decoUser.decorator';
import { type ReqUser } from '../global/types/express';

/*
  소비 리포트 API
  - 영수증 데이터를 집계해서 월별/일별/카테고리별 그래프 데이터를 반환
  - 모든 엔드포인트 로그인 필수
*/
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ====================================================================
  // GET /reports/monthly-spend?year=2026
  // 월별 지출 합계 (12개월 0-fill)
  // ====================================================================
  @Get('monthly-spend')
  getMonthlySpend(
    @DecoUser() user: ReqUser,
    @Query() query: GetReportQueryDto,
  ) {
    return this.reportsService.getMonthlySpend(user.userId, query.year);
  }

  // ====================================================================
  // GET /reports/daily-spend?year=2026&month=6
  // 일별 지출 합계 (1일~말일 0-fill)
  // ====================================================================
  @Get('daily-spend')
  getDailySpend(
    @DecoUser() user: ReqUser,
    @Query() query: GetReportQueryDto,
  ) {
    return this.reportsService.getDailySpend(
      user.userId,
      query.year,
      query.month,
    );
  }

  // ====================================================================
  // GET /reports/category-summary?year=2026&month=6
  // GET /reports/category-summary?date=2026-06-09
  // 카테고리별 지출 요약 (percentage 포함)
  // ====================================================================
  @Get('category-summary')
  getCategorySummary(
    @DecoUser() user: ReqUser,
    @Query() query: GetReportQueryDto,
  ) {
    return this.reportsService.getCategorySummary({
      userId: user.userId,
      year: query.year,
      month: query.month,
      date: query.date,
    });
  }
}