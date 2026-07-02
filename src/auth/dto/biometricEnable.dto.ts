import { IsBoolean, IsDefined, IsOptional, IsString } from 'class-validator';

export class BiometricEnableDto {
  @IsBoolean()
  @IsDefined()
  enabled: boolean;

  @IsOptional()
  @IsString()
  biometric_type?: string;

  @IsOptional()
  @IsString()
  public_key?: string;
}
