import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { type Response } from 'express';
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
  async approveKakaoPayment(
    @Query() query: KakaoApproveQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.paymentsService.approveKakaoPayment(query);
    const redirectUrl = this.paymentsService.buildFrontendPaymentRedirectUrl(
      'success',
      {
        flow: 'SUBSCRIPTION',
        paymentId: result.paymentId,
        subscriptionId: result.subscriptionId,
        methodId: result.methodId,
        status: result.status,
        approvedAt: result.approvedAt,
      },
    );

    if (this.redirectToFrontend(res, redirectUrl)) return;

    return result;
  }

  @Get('kakao/method-change/approve')
  async approveKakaoMethodChange(
    @Query() query: KakaoApproveQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.paymentsService.approveKakaoMethodChange(query);
    const redirectUrl = this.paymentsService.buildFrontendPaymentRedirectUrl(
      'success',
      {
        flow: 'METHOD_CHANGE',
        paymentId: result.paymentId,
        subscriptionId: result.subscriptionId,
        methodId: result.methodId,
        status: result.status,
        approvedAt: result.approvedAt,
      },
    );

    if (this.redirectToFrontend(res, redirectUrl)) return;

    return result;
  }

  @Get('kakao/cancel')
  async cancelKakaoPayment(
    @Query() query: KakaoResultQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.paymentsService.cancelKakaoPayment(query);
    const redirectUrl = this.paymentsService.buildFrontendPaymentRedirectUrl(
      'cancel',
      {
        paymentId: result.paymentId,
        status: result.status,
        reason: result.reason,
      },
    );

    if (this.redirectToFrontend(res, redirectUrl)) return;

    return result;
  }

  @Get('kakao/fail')
  async failKakaoPayment(
    @Query() query: KakaoResultQueryDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.paymentsService.failKakaoPayment(query);
    const redirectUrl = this.paymentsService.buildFrontendPaymentRedirectUrl(
      'fail',
      {
        paymentId: result.paymentId,
        status: result.status,
        reason: result.reason,
      },
    );

    if (this.redirectToFrontend(res, redirectUrl)) return;

    return result;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getMyPayments(
    @DecoUser() user: ReqUser,
    @Query() query: GetPaymentsQueryDto,
  ) {
    return this.paymentsService.getMyPayments(user.userId, query);
  }

  @Post('kakao/subscriptions/billing/run')
  @UseGuards(JwtAuthGuard)
  runMonthlySubscriptionBillingManually() {
    return this.paymentsService.runMonthlySubscriptionBillingManually();
  }

  private redirectToFrontend(res: Response, redirectUrl: string | null) {
    if (!redirectUrl) return false;

    res.redirect(redirectUrl);
    return true;
  }
}
