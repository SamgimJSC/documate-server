import { PaymentStatus } from '../../global/constants/paymentStatus.enum';

export class UpdatePaymentDto {
  status?: PaymentStatus;
  failReason?: string | null;
  approvedAt?: Date | null;
}
