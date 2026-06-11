import { EmailVerification } from '../entities/email-verification.entity';
import { CreateEmailVerificationDto } from '../dto/createEmailVerification.dto';
import { VerificationPurpose } from '../../global/constants/verificationPurpose.enum';

export interface EmailVerificationRepository {
  createVerification(
    dto: CreateEmailVerificationDto,
  ): Promise<EmailVerification>;
  findByVerificationId(
    verificationId: string,
  ): Promise<EmailVerification | null>;
  findActiveByEmailAndPurpose(
    email: string,
    purpose: VerificationPurpose,
  ): Promise<EmailVerification[]>;
  markAsUsed(verificationId: string): Promise<EmailVerification | null>;
  deleteByEmail(email: string): Promise<boolean>;
  deleteExpired(): Promise<number>;
}
