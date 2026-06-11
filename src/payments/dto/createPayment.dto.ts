import { PaymentStatus } from '../../global/constants/paymentStatus.enum';

export class CreatePaymentDto {
  userId: string;
  subscriptionId?: string | null;
  methodId?: string | null;
  tid?: string | null;
  amount: number;
  status?: PaymentStatus;
}
