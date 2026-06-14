import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { GetReceiptSummaryQueryDto } from './dto/getReceiptSummaryQuery.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DecoUser } from '../global/decorators/decoUser.decorator';
import { type ReqUser } from '../global/types/express';

@UseGuards(JwtAuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  // ====================================================================
  // GET /receipts/summary/monthly?year=2026
  // 월별 지출 합계 (12개월 0-fill)
  // ====================================================================
  @Get('summary/monthly')
  getMonthlySummary(
    @DecoUser() user: ReqUser,
    @Query() query: GetReceiptSummaryQueryDto,
  ) {
    return this.receiptsService.getMonthlySummary(user.userId, query.year);
  }

  // ====================================================================
  // GET /receipts/summary/category?year=2026&month=6
  // 카테고리별 지출 요약 (percentage 포함)
  // ====================================================================
  @Get('summary/category')
  getCategorySummary(
    @DecoUser() user: ReqUser,
    @Query() query: GetReceiptSummaryQueryDto,
  ) {
    return this.receiptsService.getCategorySummary(
      user.userId,
      query.year,
      query.month,
    );
  }
}