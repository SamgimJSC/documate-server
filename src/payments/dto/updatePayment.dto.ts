import { PaymentStatus } from '../../global/constants/paymentStatus.enum';

export class UpdatePaymentDto {
  subscriptionId?: string | null;
  methodId?: string | null;
  tid?: string | null;
  status?: PaymentStatus;
  failReason?: string | null;
  approvedAt?: Date | null;
}
