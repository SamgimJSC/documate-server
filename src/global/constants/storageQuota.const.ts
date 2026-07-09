import { UserPlan } from './userPlan.enum';

export const STORAGE_QUOTA_BYTES: Record<UserPlan, string> = {
  [UserPlan.FREE]: '5368709120', // 5 GB
  [UserPlan.PRO]: '53687091200', // 50 GB
};
