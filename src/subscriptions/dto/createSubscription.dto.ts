import { BillingCycle } from '../../global/constants/billingCycle.enum';
import { SubscriptionStatus } from '../../global/constants/subscriptionStatus.enum';

export class CreateSubscriptionDto {
  userId: string;
  billingCycle: BillingCycle;
  status: SubscriptionStatus;
  startedAt?: Date | null;
  currentPeriodEnd?: Date | null;
  trialEndAt?: Date | null;
}
