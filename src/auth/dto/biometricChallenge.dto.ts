import { IsDefined, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class BiometricChallengeDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @IsDefined()
  email: string;
}
