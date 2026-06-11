import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { Subscription } from './entities/subscription.entity';
import { TypeOrmSubscriptionRepository } from './model/subscription.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription])],
  controllers: [SubscriptionsController],
  exports: [TypeOrmModule, SubscriptionsService],
  providers: [SubscriptionsService, TypeOrmSubscriptionRepository],
})
export class SubscriptionsModule {}
