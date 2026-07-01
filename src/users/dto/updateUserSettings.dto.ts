import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotiEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  cameraAutoOcr?: boolean;

  @IsOptional()
  @IsBoolean()
  darkMode?: boolean;

  @IsOptional()
  @IsBoolean()
  appLockEnabled?: boolean;
}
