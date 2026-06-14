import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Platform } from '../../global/constants/platform.enum';

/*
  FCM 디바이스 토큰 등록 요청 바디 (외부 입력용)
*/
export class RegisterDeviceTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500) // DB 스키마: VARCHAR(500)
  token: string;

  @IsEnum(Platform)
  platform: Platform;
}