import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BillingCycle } from '../../global/constants/billingCycle.enum';
import { SubscriptionStatus } from '../../global/constants/subscriptionStatus.enum';
import { User } from '../../users/entities/user.entity';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid', { name: 'subscription_id' })
  subscriptionId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'billing_cycle', type: 'enum', enum: BillingCycle })
  billingCycle: BillingCycle;

  @Column({ name: 'status', type: 'enum', enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: true })
  currentPeriodEnd: Date | null;

  @Column({ name: 'is_canceled', type: 'boolean', default: false })
  isCanceled: boolean;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt: Date | null;

  @Column({ name: 'trial_end_at', type: 'timestamptz', nullable: true })
  trialEndAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
