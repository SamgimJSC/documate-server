import {
  IsBoolean,
  IsDefined,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Platform } from '../../global/constants/platform.enum';

export class PinLoginDto {
  @IsString()
  @IsEmail()
  @IsNotEmpty()
  @IsDefined()
  email: string;

  @IsNumberString()
  @IsNotEmpty()
  @IsDefined()
  @Length(6, 6)
  pinNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  deviceToken?: string;

  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @IsOptional()
  @IsBoolean()
  stayLoggedIn?: boolean;
}
