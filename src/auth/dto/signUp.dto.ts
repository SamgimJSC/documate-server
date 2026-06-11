import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { rNickname, rPassword } from '../../global/reg';

export class SignUpDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @IsDefined()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(rPassword, {
    message:
      'password must contain at least one letter and one number and be 8-20 characters long',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Matches(rNickname, {
    message:
      'nickname must be 2-8 characters and contain only Korean or English letters',
  })
  nickname: string;

  @IsNumberString()
  @IsNotEmpty()
  @IsDefined()
  @Length(6, 6)
  pinNumber: string;

  @IsUUID()
  @IsNotEmpty()
  @IsDefined()
  emailVerificationId: string;
}
