import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '../global/constants/subscriptionStatus.enum';
import { type ReqUser } from '../global/types/express';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { TypeOrmSubscriptionRepository } from './model/subscription.repository';
import { CancelSubscriptionDto } from './dto/cancelSubscription.dto';
import { BillingCycle } from '../global/constants/billingCycle.enum';
import { TypeOrmPaymentMethodRepository } from '../payments/model/payment-method.repository';
import { UserPlan } from '../global/constants/userPlan.enum';
import { Subscription } from './entities/subscription.entity';
import { PaymentMethod } from '../payments/entities/payment-method.entity';
import { UsersService } from '../users/users.service';
import { Transactional } from 'typeorm-transactional';
import { MAX_BILLING_FAILURE_COUNT } from '../payments/const/payment.const';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionRepo: TypeOrmSubscriptionRepository,
    private readonly paymentMethodRepo: TypeOrmPaymentMethodRepository,
    private readonly usersService: UsersService,
  ) {}

  async getMySubscription(user: ReqUser) {
    const subscription = await this.subscriptionRepo.findActiveByUserId(
      user.userId,
    );
    const paymentMethod = await this.getDefaultPaymentMethod(user.userId);

    return this.buildMySubscriptionResponse(
      user.plan,
      subscription,
      paymentMethod,
    );
  }

  async cancelMySubscription(user: ReqUser, dto: CancelSubscriptionDto) {
    const subscription = await this.subscriptionRepo.findActiveByUserId(
      user.userId,
    );
    if (!subscription) {
      throw new ENotFoundException({
        message: '활성 구독을 찾을 수 없습니다.',
        errorCode: ERROR_CODE.SUBSCRIPTION_NOT_FOUND,
      });
    }

    const paymentMethod = await this.getDefaultPaymentMethod(user.userId);

    if (dto.cancelAtPeriodEnd) {
      const updatedSubscription = await this.subscriptionRepo.updateSubscription(
        subscription.subscriptionId,
        {
          isCanceled: true,
          canceledAt: new Date(),
        },
      );

      return this.buildMySubscriptionResponse(
        user.plan,
        updatedSubscription,
        paymentMethod,
      );
    }

    const updatedSubscription = await this.subscriptionRepo.updateSubscription(
      subscription.subscriptionId,
      {
        status: SubscriptionStatus.CANCELED,
        isCanceled: false,
        canceledAt: new Date(),
      },
    );

    return this.buildMySubscriptionResponse(
      user.plan,
      updatedSubscription,
      paymentMethod,
    );
  }

  async undoCancelMySubscription(user: ReqUser) {
    const subscription = await this.subscriptionRepo.findActiveByUserId(
      user.userId,
    );
    if (!subscription) {
      throw new ENotFoundException({
        message: '활성 구독을 찾을 수 없습니다.',
        errorCode: ERROR_CODE.SUBSCRIPTION_NOT_FOUND,
      });
    }

    const paymentMethod = await this.getDefaultPaymentMethod(user.userId);
    const updatedSubscription = await this.subscriptionRepo.updateSubscription(
      subscription.subscriptionId,
      {
        isCanceled: false,
        canceledAt: null,
      },
    );

    return this.buildMySubscriptionResponse(
      user.plan,
      updatedSubscription,
      paymentMethod,
    );
  }

  async getSubscriptionById(subscriptionId: string) {
    return this.subscriptionRepo.findBySubscriptionId(subscriptionId);
  }

  async getActiveSubscriptionByUserId(userId: string) {
    return this.subscriptionRepo.findActiveByUserId(userId);
  }

  async getMonthlyBillingTargets(now: Date = new Date()) {
    return this.subscriptionRepo.findMonthlyBillingTargets(now);
  }

  @Transactional()
  async completeCanceledSubscription(
    subscription: Subscription,
    canceledAt: Date = new Date(),
  ) {
    const updatedSubscription = await this.subscriptionRepo.updateSubscription(
      subscription.subscriptionId,
      {
        status: SubscriptionStatus.CANCELED,
        isCanceled: false,
        canceledAt: subscription.canceledAt ?? canceledAt,
      },
    );

    await this.usersService.updatePlanAndStorageQuota(
      subscription.userId,
      UserPlan.FREE,
    );

    return updatedSubscription;
  }

  async renewMonthlySubscription(
    subscription: Subscription,
    paidAt: Date = new Date(),
  ) {
    const nextPeriodEnd = this.addOneMonth(
      this.getRenewalBaseDate(subscription, paidAt),
    );

    return this.subscriptionRepo.updateSubscription(
      subscription.subscriptionId,
      {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: nextPeriodEnd,
        isCanceled: false,
        canceledAt: null,
        failedAttemptCount: 0,
      },
    );
  }

  @Transactional()
  async recordBillingFailure(subscription: Subscription) {
    const failedAttemptCount = subscription.failedAttemptCount + 1;

    if (failedAttemptCount < MAX_BILLING_FAILURE_COUNT) {
      return this.subscriptionRepo.updateSubscription(
        subscription.subscriptionId,
        { failedAttemptCount },
      );
    }

    const updatedSubscription = await this.subscriptionRepo.updateSubscription(
      subscription.subscriptionId,
      {
        status: SubscriptionStatus.EXPIRED,
        failedAttemptCount,
      },
    );

    await this.usersService.updatePlanAndStorageQuota(
      subscription.userId,
      UserPlan.FREE,
    );

    return updatedSubscription;
  }

  async activateMonthlyProSubscription(userId: string) {
    const now = new Date();
    const currentPeriodEnd = new Date(now);
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

    const activeSubscription =
      await this.subscriptionRepo.findActiveByUserId(userId);

    if (activeSubscription) {
      return this.subscriptionRepo.updateSubscription(
        activeSubscription.subscriptionId,
        {
          billingCycle: BillingCycle.MONTHLY,
          status: SubscriptionStatus.ACTIVE,
          startedAt: activeSubscription.startedAt ?? now,
          currentPeriodEnd,
          isCanceled: false,
          canceledAt: null,
        },
      );
    }

    return this.subscriptionRepo.createSubscription({
      userId,
      billingCycle: BillingCycle.MONTHLY,
      status: SubscriptionStatus.ACTIVE,
      startedAt: now,
      currentPeriodEnd,
      trialEndAt: null,
    });
  }

  private buildMySubscriptionResponse(
    plan: UserPlan,
    subscription: Subscription | null,
    paymentMethod: PaymentMethod | null,
  ) {
    return {
      plan,
      status: subscription?.status ?? null,
      billingCycle: subscription?.billingCycle ?? null,
      currentPeriodStart: subscription?.startedAt ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      nextBillingAt: this.getNextBillingAt(subscription),
      isCanceled: subscription?.isCanceled ?? false,
      canceledAt: subscription?.canceledAt ?? null,
      cancelReason: null,
      paymentMethod: paymentMethod
        ? {
            methodId: paymentMethod.methodId,
            methodType: paymentMethod.methodType,
            displayName: paymentMethod.displayName,
            isDefault: paymentMethod.isDefault,
          }
        : null,
    };
  }

  private getNextBillingAt(subscription: Subscription | null) {
    if (!subscription) return null;
    if (subscription.isCanceled) return null;
    if (subscription.status !== SubscriptionStatus.ACTIVE) return null;

    return subscription.currentPeriodEnd;
  }

  private getDefaultPaymentMethod(userId: string) {
    return this.paymentMethodRepo.findDefaultByUserId(userId);
  }

  private getRenewalBaseDate(subscription: Subscription, paidAt: Date) {
    if (
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd > paidAt
    ) {
      return subscription.currentPeriodEnd;
    }

    return paidAt;
  }

  private addOneMonth(date: Date) {
    const nextDate = new Date(date);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  }
}
