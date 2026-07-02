import { BiometricType } from '../../global/constants/biometricType.enum';

export class UpdateUserSecurityDto {
  pinHash?: string | null;
  biometricEnabled?: boolean;
  biometricType?: BiometricType | null;
  publicKey?: string | null;
  pinFailedCount?: number;
  pinUpdatedAt?: Date | null;
}
