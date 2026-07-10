import { UserPlan } from './userPlan.enum';

export const STORAGE_QUOTA_BYTES: Record<UserPlan, string> = {
  [UserPlan.FREE]: '1073741824', // 1 GB
  [UserPlan.PRO]: '10737418240', // 10 GB
};
