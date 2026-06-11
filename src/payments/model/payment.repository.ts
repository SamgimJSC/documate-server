import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Payment } from '../entities/payment.entity';
import { PaymentRepository } from './payment.interface';
import { CreatePaymentDto } from '../dto/createPayment.dto';
import { UpdatePaymentDto } from '../dto/updatePayment.dto';

@Injectable()
export class TypeOrmPaymentRepository implements PaymentRepository {
  constructor(
    @InjectRepository(Payment)
    private readonly repo: Repository<Payment>,
  ) {}

  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
    const payment = this.repo.create(dto);
    return this.repo.save(payment);
  }

  async findByPaymentId(paymentId: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { paymentId } });
  }

  async findByUserId(userId: string): Promise<Payment[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByTid(tid: string): Promise<Payment | null> {
    return this.repo.findOne({ where: { tid } });
  }

  async updatePayment(
    paymentId: string,
    dto: UpdatePaymentDto,
  ): Promise<Payment | null> {
    const payment = await this.findByPaymentId(paymentId);
    if (!payment) return null;

    Object.assign(payment, dto);
    return this.repo.save(payment);
  }
}
