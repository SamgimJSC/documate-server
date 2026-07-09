import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '../global/constants/subscriptionStatus.enum';
import { type ReqUser } from '../global/types/express';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { TypeOrmSubscriptionRepository } from './model/subscription.repository';
import { CancelSubscriptionDto } from './dto/cancelSubscription.dto';
import { BillingCycle } from '../global/constants/billingCycle.enum';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionRepo: TypeOrmSubscriptionRepository,
  ) {}

  async getMySubscription(user: ReqUser) {
    const subscription = await this.subscriptionRepo.findActiveByUserId(
      user.userId,
    );

    return {
      plan: user.plan,
      status: subscription?.status ?? null,
      billingCycle: subscription?.billingCycle ?? null,
      startedAt: subscription?.startedAt ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      nextBillingAt: subscription?.currentPeriodEnd ?? null,
      isCanceled: subscription?.isCanceled ?? false,
      paymentMethod: null,
    };
  }

  async cancelMySubscription(userId: string, dto: CancelSubscriptionDto) {
    const subscription = await this.subscriptionRepo.findActiveByUserId(userId);
    if (!subscription) {
      throw new ENotFoundException({
        message: '활성 구독을 찾을 수 없습니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });
    }

    if (dto.cancelAtPeriodEnd) {
      return this.subscriptionRepo.updateSubscription(
        subscription.subscriptionId,
        {
          isCanceled: true,
          canceledAt: new Date(),
        },
      );
    }

    return this.subscriptionRepo.updateSubscription(subscription.subscriptionId, {
      status: SubscriptionStatus.CANCELED,
      isCanceled: false,
      canceledAt: new Date(),
    });
  }

  async undoCancelMySubscription(userId: string) {
    const subscription = await this.subscriptionRepo.findActiveByUserId(userId);
    if (!subscription) {
      throw new ENotFoundException({
        message: '활성 구독을 찾을 수 없습니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });
    }

    return this.subscriptionRepo.updateSubscription(subscription.subscriptionId, {
      isCanceled: false,
      canceledAt: null,
    });
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
}
