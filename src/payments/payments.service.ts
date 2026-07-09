import { Injectable } from '@nestjs/common';
import { BillingCycle } from '../global/constants/billingCycle.enum';
import { PaymentMethodType } from '../global/constants/paymentMethodType.enum';
import { PaymentStatus } from '../global/constants/paymentStatus.enum';
import { UserPlan } from '../global/constants/userPlan.enum';
import { TypeOrmPaymentRepository } from './model/payment.repository';
import { TypeOrmPaymentMethodRepository } from './model/payment-method.repository';
import { GetPaymentsQueryDto } from './dto/getPaymentsQuery.dto';
import {
  KakaoApproveQueryDto,
  KakaoResultQueryDto,
} from './dto/kakaoApproveQuery.dto';
import { KakaoReadyDto } from './dto/kakaoReady.dto';
import { KAKAOPAY_DISPLAY_NAME, PRO_PLAN_AMOUNT } from './const/payment.const';
import { KakaoPayProvider } from './providers/kakao-pay.provider';
import { EServiceUnavailableException } from '../global/exceptions/EServiceUnavailableException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { EBadRequestException } from '../global/exceptions/EBadRequestException';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentRepo: TypeOrmPaymentRepository,
    private readonly paymentMethodRepo: TypeOrmPaymentMethodRepository,
    private readonly kakaoPayProvider: KakaoPayProvider,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly usersService: UsersService,
  ) {}

  async readyKakaoPayment(userId: string, dto: KakaoReadyDto) {
    this.assertMonthlyOnly(dto.billingCycle);

    const amount = PRO_PLAN_AMOUNT[dto.billingCycle];
    const payment = await this.paymentRepo.createPayment({
      userId,
      subscriptionId: null,
      methodId: null,
      tid: null,
      amount,
      status: PaymentStatus.READY,
    });

    try {
      const ready = await this.kakaoPayProvider.readySubscription({
        paymentId: payment.paymentId,
        userId,
        amount,
      });

      const redirectUrl =
        ready.next_redirect_app_url ??
        ready.next_redirect_mobile_url ??
        ready.next_redirect_pc_url ??
        null;

      if (!ready.tid || !redirectUrl) {
        throw new Error('카카오페이 ready 응답에 tid 또는 redirect URL이 없습니다.');
      }

      await this.paymentRepo.updatePayment(payment.paymentId, {
        tid: ready.tid,
        status: PaymentStatus.READY,
      });

      return {
        paymentId: payment.paymentId,
        tid: ready.tid,
        redirectUrl,
        appRedirectUrl: ready.next_redirect_app_url ?? null,
        mobileRedirectUrl: ready.next_redirect_mobile_url ?? null,
        pcRedirectUrl: ready.next_redirect_pc_url ?? null,
        status: PaymentStatus.READY,
        billingCycle: dto.billingCycle,
        amount,
      };
    } catch (error) {
      const reason = this.truncateFailReason(
        this.kakaoPayProvider.getFailureMessage(error),
      );

      await this.paymentRepo.updatePayment(payment.paymentId, {
        status: PaymentStatus.FAILED,
        failReason: reason,
      });

      throw new EServiceUnavailableException({
        message: '카카오페이 결제 준비 요청에 실패했습니다.',
        errorCode: ERROR_CODE.PAYMENT_READY_FAILED,
      });
    }
  }

  async approveKakaoPayment(query: KakaoApproveQueryDto) {
    const payment = await this.paymentRepo.findByPaymentId(query.paymentId);
    if (!payment) {
      throw new ENotFoundException({
        message: '결제 정보를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.PAYMENT_NOT_FOUND,
      });
    }

    if (payment.status !== PaymentStatus.READY || !payment.tid) {
      throw new EBadRequestException({
        message: '승인 가능한 결제 상태가 아닙니다.',
        errorCode: ERROR_CODE.PAYMENT_NOT_READY,
      });
    }

    let approvedAt = new Date();
    let sid: string;

    try {
      const approved = await this.kakaoPayProvider.approveSubscription({
        paymentId: payment.paymentId,
        userId: payment.userId,
        tid: payment.tid,
        pgToken: query.pg_token,
      });

      if (!approved.sid) {
        throw new Error('카카오페이 approve 응답에 sid가 없습니다.');
      }

      sid = approved.sid;
      approvedAt = approved.approved_at
        ? new Date(approved.approved_at)
        : approvedAt;
    } catch (error) {
      const reason = this.truncateFailReason(
        this.kakaoPayProvider.getFailureMessage(error),
      );

      await this.paymentRepo.updatePayment(payment.paymentId, {
        status: PaymentStatus.FAILED,
        failReason: reason,
      });

      throw new EServiceUnavailableException({
        message: '카카오페이 결제 승인 요청에 실패했습니다.',
        errorCode: ERROR_CODE.PAYMENT_APPROVE_FAILED,
      });
    }

    const paymentMethod = await this.paymentMethodRepo.createMethod({
      userId: payment.userId,
      methodType: PaymentMethodType.KAKAOPAY,
      billingKey: sid,
      displayName: KAKAOPAY_DISPLAY_NAME,
      isDefault: false,
    });
    await this.paymentMethodRepo.setDefault(
      payment.userId,
      paymentMethod.methodId,
    );

    const subscription =
      await this.subscriptionsService.activateMonthlyProSubscription(
        payment.userId,
      );
    if (!subscription) {
      throw new EServiceUnavailableException({
        message: '구독 활성화에 실패했습니다.',
        errorCode: ERROR_CODE.PAYMENT_APPROVE_FAILED,
      });
    }

    await this.usersService.updatePlanAndStorageQuota(
      payment.userId,
      UserPlan.PRO,
    );

    const updatedPayment = await this.paymentRepo.updatePayment(
      payment.paymentId,
      {
        subscriptionId: subscription.subscriptionId,
        methodId: paymentMethod.methodId,
        status: PaymentStatus.APPROVED,
        failReason: null,
        approvedAt,
      },
    );

    return {
      paymentId: payment.paymentId,
      tid: payment.tid,
      subscriptionId: subscription.subscriptionId,
      methodId: paymentMethod.methodId,
      status: PaymentStatus.APPROVED,
      approvedAt: updatedPayment?.approvedAt ?? approvedAt,
    };
  }

  async cancelKakaoPayment(query: KakaoResultQueryDto) {
    return {
      paymentId: query.paymentId,
      status: PaymentStatus.CANCELED,
      reason: query.reason ?? null,
      message: '카카오페이 cancel 콜백 엔드포인트 골격입니다.',
    };
  }

  async failKakaoPayment(query: KakaoResultQueryDto) {
    return {
      paymentId: query.paymentId,
      status: PaymentStatus.FAILED,
      reason: query.reason ?? null,
      message: '카카오페이 fail 콜백 엔드포인트 골격입니다.',
    };
  }

  async getMyPayments(userId: string, query: GetPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const payments = await this.paymentRepo.findByUserId(userId);
    const start = (page - 1) * limit;
    const items = payments.slice(start, start + limit);

    return {
      items,
      total: payments.length,
      page,
      limit,
      hasNext: start + limit < payments.length,
    };
  }

  private truncateFailReason(reason: string): string {
    return reason.length > 200 ? reason.slice(0, 200) : reason;
  }

  private assertMonthlyOnly(billingCycle: BillingCycle): void {
    if (billingCycle !== BillingCycle.MONTHLY) {
      throw new EBadRequestException({
        message: '현재 PRO 구독은 월간 결제만 지원합니다.',
        errorCode: ERROR_CODE.PAYMENT_UNSUPPORTED_BILLING_CYCLE,
      });
    }
  }
}
