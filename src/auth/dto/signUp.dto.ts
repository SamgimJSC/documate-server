import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class SignUpDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @IsDefined()
  email: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  nickname: string;

  @IsNumberString()
  @IsNotEmpty()
  @IsDefined()
  @Length(6)
  pinNumber: string;

  @IsUUID()
  @IsNotEmpty()
  @IsDefined()
  emailVerificationId: string;
}
