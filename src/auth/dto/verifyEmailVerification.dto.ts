import { IsDefined, IsNotEmpty, IsNumberString, IsUUID } from 'class-validator';

export class VerifyEmailVerificationDto {
  @IsUUID()
  @IsNotEmpty()
  @IsDefined()
  emailVerificationId: string;

  @IsNumberString()
  @IsNotEmpty()
  @IsDefined()
  codeNumber: string;
}
