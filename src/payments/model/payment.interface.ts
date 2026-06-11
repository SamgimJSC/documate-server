import { CreatePaymentDto } from '../dto/createPayment.dto';
import { UpdatePaymentDto } from '../dto/updatePayment.dto';
import { Payment } from '../entities/payment.entity';

export interface PaymentRepository {
  createPayment(dto: CreatePaymentDto): Promise<Payment>;
  findByPaymentId(paymentId: string): Promise<Payment | null>;
  findByUserId(userId: string): Promise<Payment[]>;
  findByTid(tid: string): Promise<Payment | null>;
  updatePayment(
    paymentId: string,
    dto: UpdatePaymentDto,
  ): Promise<Payment | null>;
}
