import { IsDefined, IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { VerificationPurpose } from '../../global/constants/verificationPurpose.enum';

export class SendEmailVerificationDto {
  @IsEmail()
  @IsNotEmpty()
  @IsDefined()
  email: string;

  @IsEnum(VerificationPurpose)
  @IsNotEmpty()
  @IsDefined()
  purpose: VerificationPurpose;
}
