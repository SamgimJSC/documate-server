import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';

import { ReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DecoUser } from '../global/decorators/decoUser.decorator';
import { type ReqUser } from '../global/types/express';

@UseGuards(JwtAuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  // ====================================================================
  // GET /receipts/:id
  // 영수증 상세 조회
  // ====================================================================
  @Get(':id')
  getReceiptDetail(
    @DecoUser() user: ReqUser,
    @Param('id', ParseUUIDPipe) receiptId: string,
  ) {
    return this.receiptsService.getReceiptDetail(user.userId, receiptId);
  }
}