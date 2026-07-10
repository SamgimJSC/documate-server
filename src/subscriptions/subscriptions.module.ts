import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { TypeOrmSubscriptionRepository } from './model/subscription.repository';
import { PaymentMethod } from '../payments/entities/payment-method.entity';
import { TypeOrmPaymentMethodRepository } from '../payments/model/payment-method.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, PaymentMethod]),
    UsersModule,
  ],
  controllers: [SubscriptionsController],
  exports: [TypeOrmModule, SubscriptionsService],
  providers: [
    SubscriptionsService,
    TypeOrmSubscriptionRepository,
    TypeOrmPaymentMethodRepository,
  ],
})
export class SubscriptionsModule {}
