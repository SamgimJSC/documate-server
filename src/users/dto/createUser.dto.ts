import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { rNickname, rPassword } from '../../global/reg';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
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
      'name must be 2-8 characters and contain only Korean or English letters',
  })
  nickname: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  realName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileImgUrl?: string;
}
