import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentMethod } from './entities/payment-method.entity';
import { Payment } from './entities/payment.entity';
import { TypeOrmPaymentMethodRepository } from './model/payment-method.repository';
import { TypeOrmPaymentRepository } from './model/payment.repository';
import { KakaoPayProvider } from './providers/kakao-pay.provider';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { SubscriptionBillingScheduler } from './subscription-billing.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentMethod, Payment]),
    SubscriptionsModule,
    UsersModule,
  ],
  controllers: [PaymentsController],
  exports: [TypeOrmModule, PaymentsService],
  providers: [
    PaymentsService,
    KakaoPayProvider,
    TypeOrmPaymentMethodRepository,
    TypeOrmPaymentRepository,
    SubscriptionBillingScheduler,
  ],
})
export class PaymentsModule {}
