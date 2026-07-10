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
import {
  KAKAOPAY_DISPLAY_NAME,
  KAKAOPAY_METHOD_CHANGE_APPROVAL_SUFFIX,
  KAKAOPAY_METHOD_CHANGE_ITEM_NAME,
  PRO_PLAN_AMOUNT,
} from './const/payment.const';
import { KakaoPayProvider } from './providers/kakao-pay.provider';
import { EServiceUnavailableException } from '../global/exceptions/EServiceUnavailableException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { EBadRequestException } from '../global/exceptions/EBadRequestException';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { UsersService } from '../users/users.service';
import { TypedConfigService } from '../configs/typedConfig.service';
import {
  decryptBillingKey,
  encryptBillingKey,
} from './utils/billing-key.crypto';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Transactional } from 'typeorm-transactional';

type MonthlyBillingResult = {
  subscriptionId: string;
  userId: string;
  result: PaymentStatus.APPROVED | PaymentStatus.FAILED | 'CANCELED';
  paymentId: string | null;
  message: string | null;
  currentPeriodEnd: Date | null;
};

type PaymentFrontendRedirectResult = 'success' | 'cancel' | 'fail';

type PaymentFrontendRedirectPayload = Record<
  string,
  string | number | boolean | Date | null | undefined
>;

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentRepo: TypeOrmPaymentRepository,
    private readonly paymentMethodRepo: TypeOrmPaymentMethodRepository,
    private readonly kakaoPayProvider: KakaoPayProvider,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly usersService: UsersService,
    private readonly configService: TypedConfigService,
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

  async readyKakaoMethodChange(userId: string) {
    const subscription =
      await this.subscriptionsService.getActiveSubscriptionByUserId(userId);
    if (!subscription) {
      throw new ENotFoundException({
        message: '활성 구독을 찾을 수 없습니다.',
        errorCode: ERROR_CODE.SUBSCRIPTION_NOT_FOUND,
      });
    }

    const amount = PRO_PLAN_AMOUNT[BillingCycle.MONTHLY];
    const payment = await this.paymentRepo.createPayment({
      userId,
      subscriptionId: subscription.subscriptionId,
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
        itemName: KAKAOPAY_METHOD_CHANGE_ITEM_NAME,
        approvalUrl: this.buildMethodChangeApprovalUrl(),
      });

      const redirectUrl =
        ready.next_redirect_app_url ??
        ready.next_redirect_mobile_url ??
        ready.next_redirect_pc_url ??
        null;

      if (!ready.tid || !redirectUrl) {
        throw new Error('KakaoPay ready response missing tid or redirect URL.');
      }

      await this.paymentRepo.updatePayment(payment.paymentId, {
        tid: ready.tid,
        status: PaymentStatus.READY,
      });

      return {
        paymentId: payment.paymentId,
        subscriptionId: subscription.subscriptionId,
        tid: ready.tid,
        redirectUrl,
        appRedirectUrl: ready.next_redirect_app_url ?? null,
        mobileRedirectUrl: ready.next_redirect_mobile_url ?? null,
        pcRedirectUrl: ready.next_redirect_pc_url ?? null,
        status: PaymentStatus.READY,
        billingCycle: subscription.billingCycle,
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
        message: '카카오페이 결제수단 변경 준비 요청에 실패했습니다.',
        errorCode: ERROR_CODE.PAYMENT_READY_FAILED,
      });
    }
  }

  @Transactional()
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
      billingKey: encryptBillingKey(
        sid,
        this.configService.get('PAYMENT_BILLING_KEY_SECRET'),
      ),
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

  @Transactional()
  async approveKakaoMethodChange(query: KakaoApproveQueryDto) {
    const payment = await this.paymentRepo.findByPaymentId(query.paymentId);
    if (!payment) {
      throw new ENotFoundException({
        message: '결제 정보를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.PAYMENT_NOT_FOUND,
      });
    }

    if (
      payment.status !== PaymentStatus.READY ||
      !payment.tid ||
      !payment.subscriptionId
    ) {
      throw new EBadRequestException({
        message: '결제수단 변경 승인 가능한 결제 상태가 아닙니다.',
        errorCode: ERROR_CODE.PAYMENT_NOT_READY,
      });
    }

    const subscription = await this.subscriptionsService.getSubscriptionById(
      payment.subscriptionId,
    );
    if (!subscription) {
      throw new ENotFoundException({
        message: '구독 정보를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.SUBSCRIPTION_NOT_FOUND,
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
        throw new Error('KakaoPay approve response missing sid.');
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
        message: '카카오페이 결제수단 변경 승인 요청에 실패했습니다.',
        errorCode: ERROR_CODE.PAYMENT_APPROVE_FAILED,
      });
    }

    const paymentMethod = await this.paymentMethodRepo.createMethod({
      userId: payment.userId,
      methodType: PaymentMethodType.KAKAOPAY,
      billingKey: encryptBillingKey(
        sid,
        this.configService.get('PAYMENT_BILLING_KEY_SECRET'),
      ),
      displayName: KAKAOPAY_DISPLAY_NAME,
      isDefault: false,
    });
    await this.paymentMethodRepo.setDefault(
      payment.userId,
      paymentMethod.methodId,
    );

    const updatedPayment = await this.paymentRepo.updatePayment(
      payment.paymentId,
      {
        methodId: paymentMethod.methodId,
        status: PaymentStatus.APPROVED,
        failReason: null,
        approvedAt,
      },
    );

    return {
      paymentId: payment.paymentId,
      subscriptionId: subscription.subscriptionId,
      methodId: paymentMethod.methodId,
      status: PaymentStatus.APPROVED,
      approvedAt: updatedPayment?.approvedAt ?? approvedAt,
      paymentMethod: {
        methodId: paymentMethod.methodId,
        methodType: paymentMethod.methodType,
        displayName: paymentMethod.displayName,
        isDefault: true,
      },
    };
  }

  async cancelKakaoPayment(query: KakaoResultQueryDto) {
    const payment = await this.updateKakaoResultPayment(
      query.paymentId,
      PaymentStatus.CANCELED,
      query.reason ?? '사용자가 카카오페이 결제를 취소했습니다.',
    );

    return {
      paymentId: payment.paymentId,
      status: PaymentStatus.CANCELED,
      reason: payment.failReason,
    };
  }

  async failKakaoPayment(query: KakaoResultQueryDto) {
    const payment = await this.updateKakaoResultPayment(
      query.paymentId,
      PaymentStatus.FAILED,
      query.reason ?? '카카오페이 결제에 실패했습니다.',
    );

    return {
      paymentId: payment.paymentId,
      status: PaymentStatus.FAILED,
      reason: payment.failReason,
    };
  }

  async getMyPayments(userId: string, query: GetPaymentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const payments = (await this.paymentRepo.findByUserId(userId)).filter(
      (payment) => payment.status !== PaymentStatus.READY,
    );
    const start = (page - 1) * limit;
    const items = payments.slice(start, start + limit);
    const methodMap = await this.getPaymentMethodMap(items);
    const subscriptionMap = await this.getSubscriptionMap(items);

    return {
      items: items.map((payment) =>
        this.buildPaymentHistoryItem(
          payment,
          payment.methodId ? (methodMap.get(payment.methodId) ?? null) : null,
          payment.subscriptionId
            ? (subscriptionMap.get(payment.subscriptionId) ?? null)
            : null,
        ),
      ),
      total: payments.length,
      page,
      limit,
      hasNext: start + limit < payments.length,
    };
  }

  buildFrontendPaymentRedirectUrl(
    result: PaymentFrontendRedirectResult,
    payload: PaymentFrontendRedirectPayload,
  ) {
    const baseUrl = this.getFrontendPaymentRedirectBaseUrl(result);
    if (!baseUrl) return null;

    try {
      const url = new URL(baseUrl);
      url.searchParams.set('result', result);

      Object.entries(payload).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return;

        url.searchParams.set(
          key,
          value instanceof Date ? value.toISOString() : String(value),
        );
      });

      return url.toString();
    } catch {
      return null;
    }
  }

  async runMonthlySubscriptionBilling(now: Date = new Date()) {
    const subscriptions =
      await this.subscriptionsService.getMonthlyBillingTargets(now);
    const results: MonthlyBillingResult[] = [];

    for (const subscription of subscriptions) {
      if (subscription.isCanceled) {
        const completedSubscription =
          await this.subscriptionsService.completeCanceledSubscription(
            subscription,
            now,
          );

        results.push({
          subscriptionId: subscription.subscriptionId,
          userId: subscription.userId,
          result: 'CANCELED',
          paymentId: null,
          message: '해지예약 구독이 종료되었습니다.',
          currentPeriodEnd: completedSubscription?.currentPeriodEnd ?? null,
        });
        continue;
      }

      results.push(await this.billMonthlySubscription(subscription, now));
    }

    return {
      total: subscriptions.length,
      approved: results.filter((result) => result.result === 'APPROVED').length,
      failed: results.filter((result) => result.result === 'FAILED').length,
      canceled: results.filter((result) => result.result === 'CANCELED').length,
      results,
    };
  }

  async runMonthlySubscriptionBillingManually() {
    if (process.env.NODE_ENV === 'production') {
      throw new EBadRequestException({
        message: '운영 환경에서는 수동 정기결제 실행 API를 사용할 수 없습니다.',
        errorCode: ERROR_CODE.PAYMENT_BILLING_RUN_FORBIDDEN,
      });
    }

    return this.runMonthlySubscriptionBilling();
  }

  private async billMonthlySubscription(
    subscription: Subscription,
    now: Date,
  ): Promise<MonthlyBillingResult> {
    const amount = PRO_PLAN_AMOUNT[BillingCycle.MONTHLY];
    const paymentMethod = await this.paymentMethodRepo.findDefaultByUserId(
      subscription.userId,
    );
    const payment = await this.paymentRepo.createPayment({
      userId: subscription.userId,
      subscriptionId: subscription.subscriptionId,
      methodId: paymentMethod?.methodId ?? null,
      tid: null,
      amount,
      status: PaymentStatus.READY,
    });

    if (!paymentMethod) {
      const reason = '기본 결제수단을 찾을 수 없습니다.';
      await this.paymentRepo.updatePayment(payment.paymentId, {
        status: PaymentStatus.FAILED,
        failReason: reason,
      });

      return this.buildBillingResult(
        subscription,
        payment.paymentId,
        PaymentStatus.FAILED,
        reason,
      );
    }

    let sid: string;
    try {
      sid = decryptBillingKey(
        paymentMethod.billingKey,
        this.configService.get('PAYMENT_BILLING_KEY_SECRET'),
      );
    } catch {
      const reason = '정기결제 키 복호화에 실패했습니다.';
      await this.paymentRepo.updatePayment(payment.paymentId, {
        status: PaymentStatus.FAILED,
        failReason: reason,
      });

      return this.buildBillingResult(
        subscription,
        payment.paymentId,
        PaymentStatus.FAILED,
        reason,
      );
    }

    try {
      const approved =
        await this.kakaoPayProvider.requestSubscriptionPayment({
          paymentId: payment.paymentId,
          userId: subscription.userId,
          sid,
          amount,
        });
      const approvedAt = approved.approved_at
        ? new Date(approved.approved_at)
        : now;

      await this.paymentRepo.updatePayment(payment.paymentId, {
        tid: approved.tid,
        status: PaymentStatus.APPROVED,
        failReason: null,
        approvedAt,
      });
      const renewedSubscription =
        await this.subscriptionsService.renewMonthlySubscription(
          subscription,
          approvedAt,
        );

      return {
        subscriptionId: subscription.subscriptionId,
        userId: subscription.userId,
        result: PaymentStatus.APPROVED,
        paymentId: payment.paymentId,
        message: null,
        currentPeriodEnd: renewedSubscription?.currentPeriodEnd ?? null,
      };
    } catch (error) {
      const reason = this.truncateFailReason(
        this.kakaoPayProvider.getFailureMessage(error),
      );
      await this.paymentRepo.updatePayment(payment.paymentId, {
        status: PaymentStatus.FAILED,
        failReason: reason,
      });

      return this.buildBillingResult(
        subscription,
        payment.paymentId,
        PaymentStatus.FAILED,
        reason,
      );
    }
  }

  private buildBillingResult(
    subscription: Subscription,
    paymentId: string,
    status: PaymentStatus.APPROVED | PaymentStatus.FAILED,
    message: string | null,
  ): MonthlyBillingResult {
    return {
      subscriptionId: subscription.subscriptionId,
      userId: subscription.userId,
      result: status,
      paymentId,
      message,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  }

  private async getPaymentMethodMap(payments: Payment[]) {
    const methodIds = [
      ...new Set(
        payments
          .map((payment) => payment.methodId)
          .filter((methodId): methodId is string => Boolean(methodId)),
      ),
    ];
    const methods = await Promise.all(
      methodIds.map((methodId) =>
        this.paymentMethodRepo.findByMethodId(methodId),
      ),
    );

    return new Map(
      methods
        .filter((method): method is PaymentMethod => Boolean(method))
        .map((method) => [method.methodId, method]),
    );
  }

  private async getSubscriptionMap(payments: Payment[]) {
    const subscriptionIds = [
      ...new Set(
        payments
          .map((payment) => payment.subscriptionId)
          .filter(
            (subscriptionId): subscriptionId is string =>
              Boolean(subscriptionId),
          ),
      ),
    ];
    const subscriptions = await Promise.all(
      subscriptionIds.map((subscriptionId) =>
        this.subscriptionsService.getSubscriptionById(subscriptionId),
      ),
    );

    return new Map(
      subscriptions
        .filter(
          (subscription): subscription is Subscription => Boolean(subscription),
        )
        .map((subscription) => [subscription.subscriptionId, subscription]),
    );
  }

  private buildPaymentHistoryItem(
    payment: Payment,
    method: PaymentMethod | null,
    subscription: Subscription | null,
  ) {
    return {
      paymentId: payment.paymentId,
      subscriptionId: payment.subscriptionId,
      methodId: payment.methodId,
      status: payment.status,
      amount: Number(payment.amount),
      billingCycle: subscription?.billingCycle ?? null,
      methodType: method?.methodType ?? null,
      methodName: method?.displayName ?? null,
      failReason: payment.failReason,
      approvedAt: payment.approvedAt,
      createdAt: payment.createdAt,
    };
  }

  private truncateFailReason(reason: string): string {
    return reason.length > 200 ? reason.slice(0, 200) : reason;
  }

  private buildMethodChangeApprovalUrl(): string {
    const approvalUrl = new URL(
      this.configService.get('KAKAOPAY_APPROVAL_URL'),
    );

    if (approvalUrl.pathname.endsWith('/approve')) {
      approvalUrl.pathname = `${approvalUrl.pathname.slice(
        0,
        -'/approve'.length,
      )}${KAKAOPAY_METHOD_CHANGE_APPROVAL_SUFFIX}`;
    } else {
      approvalUrl.pathname = KAKAOPAY_METHOD_CHANGE_APPROVAL_SUFFIX;
    }
    approvalUrl.search = '';

    return approvalUrl.toString();
  }

  private getFrontendPaymentRedirectBaseUrl(
    result: PaymentFrontendRedirectResult,
  ) {
    if (result === 'success') {
      return this.configService.get('FRONTEND_PAYMENT_SUCCESS_URL');
    }

    if (result === 'cancel') {
      return this.configService.get('FRONTEND_PAYMENT_CANCEL_URL');
    }

    return this.configService.get('FRONTEND_PAYMENT_FAIL_URL');
  }

  private async updateKakaoResultPayment(
    paymentId: string,
    status: PaymentStatus.CANCELED | PaymentStatus.FAILED,
    reason: string,
  ) {
    const payment = await this.paymentRepo.findByPaymentId(paymentId);
    if (!payment) {
      throw new ENotFoundException({
        message: '결제 정보를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.PAYMENT_NOT_FOUND,
      });
    }

    const updatedPayment = await this.paymentRepo.updatePayment(paymentId, {
      status,
      failReason: this.truncateFailReason(reason),
    });

    return updatedPayment ?? payment;
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
