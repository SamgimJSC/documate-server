import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentMethod } from './entities/payment-method.entity';
import { Payment } from './entities/payment.entity';
import { TypeOrmPaymentMethodRepository } from './model/payment-method.repository';
import { TypeOrmPaymentRepository } from './model/payment.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethod, Payment])],
  controllers: [PaymentsController],
  exports: [TypeOrmModule, PaymentsService],
  providers: [
    PaymentsService,
    TypeOrmPaymentMethodRepository,
    TypeOrmPaymentRepository,
  ],
})
export class PaymentsModule {}
