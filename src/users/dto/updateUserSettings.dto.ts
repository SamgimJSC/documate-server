export class UpdateUserSettingsDto {
  pushEnabled?: boolean;
  emailNotiEnabled?: boolean;
  cameraAutoOcr?: boolean | null;
  darkMode?: boolean | null;
  appLockEnabled?: boolean | null;
}
