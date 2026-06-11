import { VerificationPurpose } from '../../global/constants/verificationPurpose.enum';

export class CreateEmailVerificationDto {
  email: string;
  code: string;
  purpose: VerificationPurpose;
  expiresAt: Date;
}
