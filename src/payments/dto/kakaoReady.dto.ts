import { IsEnum } from 'class-validator';
import { BillingCycle } from '../../global/constants/billingCycle.enum';

export class KakaoReadyDto {
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;
}
