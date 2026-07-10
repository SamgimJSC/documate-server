import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DecoUser } from '../global/decorators/decoUser.decorator';
import { type ReqUser } from '../global/types/express';
import { GetPaymentsQueryDto } from './dto/getPaymentsQuery.dto';
import {
  KakaoApproveQueryDto,
  KakaoResultQueryDto,
} from './dto/kakaoApproveQuery.dto';
import { KakaoReadyDto } from './dto/kakaoReady.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('kakao/ready')
  @UseGuards(JwtAuthGuard)
  readyKakaoPayment(@DecoUser() user: ReqUser, @Body() dto: KakaoReadyDto) {
    return this.paymentsService.readyKakaoPayment(user.userId, dto);
  }

  @Post('kakao/method-change/ready')
  @UseGuards(JwtAuthGuard)
  readyKakaoMethodChange(@DecoUser() user: ReqUser) {
    return this.paymentsService.readyKakaoMethodChange(user.userId);
  }

  @Get('kakao/approve')
  approveKakaoPayment(@Query() query: KakaoApproveQueryDto) {
    return this.paymentsService.approveKakaoPayment(query);
  }

  @Get('kakao/method-change/approve')
  approveKakaoMethodChange(@Query() query: KakaoApproveQueryDto) {
    return this.paymentsService.approveKakaoMethodChange(query);
  }

  @Get('kakao/cancel')
  cancelKakaoPayment(@Query() query: KakaoResultQueryDto) {
    return this.paymentsService.cancelKakaoPayment(query);
  }

  @Get('kakao/fail')
  failKakaoPayment(@Query() query: KakaoResultQueryDto) {
    return this.paymentsService.failKakaoPayment(query);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getMyPayments(
    @DecoUser() user: ReqUser,
    @Query() query: GetPaymentsQueryDto,
  ) {
    return this.paymentsService.getMyPayments(user.userId, query);
  }
}
