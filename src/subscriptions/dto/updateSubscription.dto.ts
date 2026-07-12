import { SubscriptionStatus } from '../../global/constants/subscriptionStatus.enum';
import { BillingCycle } from '../../global/constants/billingCycle.enum';

export class UpdateSubscriptionDto {
  billingCycle?: BillingCycle;
  status?: SubscriptionStatus;
  startedAt?: Date | null;
  currentPeriodEnd?: Date | null;
  isCanceled?: boolean;
  canceledAt?: Date | null;
  trialEndAt?: Date | null;
  failedAttemptCount?: number;
}
