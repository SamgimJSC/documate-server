import { CreateSubscriptionDto } from '../dto/createSubscription.dto';
import { UpdateSubscriptionDto } from '../dto/updateSubscription.dto';
import { Subscription } from '../entities/subscription.entity';

export interface SubscriptionRepository {
  createSubscription(dto: CreateSubscriptionDto): Promise<Subscription>;
  findBySubscriptionId(subscriptionId: string): Promise<Subscription | null>;
  findActiveByUserId(userId: string): Promise<Subscription | null>;
  findByUserId(userId: string): Promise<Subscription[]>;
  updateSubscription(
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<Subscription | null>;
}
