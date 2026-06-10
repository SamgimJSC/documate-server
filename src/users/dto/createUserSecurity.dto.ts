import { BiometricType } from '../../global/constants/biometricType.enum';

export class CreateUserSecurityDto {
  userId: string;
  pinHash?: string | null;
  biometricEnabled?: boolean;
  biometricType?: BiometricType | null;
}
