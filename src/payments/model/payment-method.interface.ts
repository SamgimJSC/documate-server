import { CreatePaymentMethodDto } from '../dto/createPaymentMethod.dto';
import { PaymentMethod } from '../entities/payment-method.entity';

export interface PaymentMethodRepository {
  createMethod(dto: CreatePaymentMethodDto): Promise<PaymentMethod>;
  findByMethodId(methodId: string): Promise<PaymentMethod | null>;
  findByUserId(userId: string): Promise<PaymentMethod[]>;
  findDefaultByUserId(userId: string): Promise<PaymentMethod | null>;
  setDefault(userId: string, methodId: string): Promise<boolean>;
  deleteMethod(methodId: string): Promise<boolean>;
}
