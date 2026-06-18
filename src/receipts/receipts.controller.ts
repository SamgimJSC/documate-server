import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CreateReceiptRequestDto } from './dto/createReceiptRequest.dto';

@Controller('receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  createReceipt(@Req() req: any, @Body() dto: CreateReceiptRequestDto) {
    return this.receiptsService.createReceipt(req.user.userId, dto);
  }
}