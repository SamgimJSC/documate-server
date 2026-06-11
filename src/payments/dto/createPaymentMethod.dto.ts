import { PaymentMethodType } from '../../global/constants/paymentMethodType.enum';

export class CreatePaymentMethodDto {
  userId: string;
  methodType: PaymentMethodType;
  billingKey: string;
  displayName?: string | null;
  isDefault?: boolean;
}
