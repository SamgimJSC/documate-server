import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ReceiptsService } from './receipts.service';
import { CreateReceiptRequestDto } from './dto/createReceiptRequest.dto';
import { GetReceiptsQueryDto } from './dto/getReceiptsQuery.dto';
import { UpdateReceiptRequestDto } from './dto/updateReceiptRequest.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DecoUser } from '../global/decorators/decoUser.decorator';
import { type ReqUser } from '../global/types/express';

/*
  영수증 API
  - 모든 엔드포인트 로그인 필수
  - 본인 영수증만 조회/수정/삭제 가능
*/
@UseGuards(JwtAuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  // ====================================================================
  // POST /receipts
  // 영수증 생성 (언니 작업분)
  // ====================================================================
  @Post()
  createReceipt(
    @DecoUser() user: ReqUser,
    @Body() body: CreateReceiptRequestDto,
  ) {
    return this.receiptsService.createReceipt(user.userId, body);
  }

  // ====================================================================
  // GET /receipts
  // 영수증 목록 조회 (검색/필터/정렬/페이지네이션)
  // ====================================================================
  @Get()
  getReceipts(
    @DecoUser() user: ReqUser,
    @Query() query: GetReceiptsQueryDto,
  ) {
    return this.receiptsService.getReceipts(user.userId, query);
  }

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

  // ====================================================================
  // PATCH /receipts/:id
  // 영수증 수정 (일부 필드만 보내도 OK)
  // ====================================================================
  @Patch(':id')
  updateReceipt(
    @DecoUser() user: ReqUser,
    @Param('id', ParseUUIDPipe) receiptId: string,
    @Body() body: UpdateReceiptRequestDto,
  ) {
    return this.receiptsService.updateReceipt(user.userId, receiptId, body);
  }

  // ====================================================================
  // DELETE /receipts/:id
  // 영수증 삭제 (소프트 삭제, 204)
  // ====================================================================
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeReceipt(
    @DecoUser() user: ReqUser,
    @Param('id', ParseUUIDPipe) receiptId: string,
  ) {
    return this.receiptsService.removeReceipt(user.userId, receiptId);
  }
}