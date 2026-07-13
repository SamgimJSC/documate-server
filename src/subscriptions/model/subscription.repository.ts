import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';

import { Subscription } from '../entities/subscription.entity';
import { SubscriptionRepository } from './subscription.interface';
import { CreateSubscriptionDto } from '../dto/createSubscription.dto';
import { UpdateSubscriptionDto } from '../dto/updateSubscription.dto';
import { SubscriptionStatus } from '../../global/constants/subscriptionStatus.enum';
import { BillingCycle } from '../../global/constants/billingCycle.enum';

@Injectable()
export class TypeOrmSubscriptionRepository implements SubscriptionRepository {
  constructor(
    @InjectRepository(Subscription)
    private readonly repo: Repository<Subscription>,
  ) {}

  async createSubscription(dto: CreateSubscriptionDto): Promise<Subscription> {
    const subscription = this.repo.create(dto);
    return this.repo.save(subscription);
  }

  async findBySubscriptionId(
    subscriptionId: string,
  ): Promise<Subscription | null> {
    return this.repo.findOne({ where: { subscriptionId } });
  }

  async findActiveByUserId(userId: string): Promise<Subscription | null> {
    return this.repo.findOne({
      where: {
        userId,
        status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
      },
    });
  }

  async findByUserId(userId: string): Promise<Subscription[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findMonthlyBillingTargets(now: Date): Promise<Subscription[]> {
    return this.repo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodEnd: LessThanOrEqual(now),
      },
      order: { currentPeriodEnd: 'ASC' },
    });
  }

  async updateSubscription(
    subscriptionId: string,
    dto: UpdateSubscriptionDto,
  ): Promise<Subscription | null> {
    const subscription = await this.findBySubscriptionId(subscriptionId);
    if (!subscription) return null;

    Object.assign(subscription, dto);
    return this.repo.save(subscription);
  }
}
