import { SubscriptionStatus } from '../../global/constants/subscriptionStatus.enum';

export class UpdateSubscriptionDto {
  status?: SubscriptionStatus;
  currentPeriodEnd?: Date | null;
  isCanceled?: boolean;
  canceledAt?: Date | null;
  trialEndAt?: Date | null;
}
