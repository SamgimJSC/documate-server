import { IsDefined, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Platform } from '../../global/constants/platform.enum';

export class LoginDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @IsDefined()
  email: string;

  @IsString()
  @IsDefined()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceToken?: string;

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;
}
