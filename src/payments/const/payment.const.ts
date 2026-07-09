import { BillingCycle } from '../../global/constants/billingCycle.enum';

export const KAKAOPAY_READY_PATH = '/online/v1/payment/ready';
export const KAKAOPAY_APPROVE_PATH = '/online/v1/payment/approve';

export const PRO_PLAN_ITEM_NAME = 'DocuMate PRO';
export const KAKAOPAY_DISPLAY_NAME = '카카오페이';

export const PRO_PLAN_AMOUNT: Record<BillingCycle, number> = {
  [BillingCycle.MONTHLY]: 0,
  [BillingCycle.YEARLY]: 0,
};

export const KAKAOPAY_DEFAULT_QUANTITY = 1;
export const KAKAOPAY_TAX_FREE_AMOUNT = 0;
