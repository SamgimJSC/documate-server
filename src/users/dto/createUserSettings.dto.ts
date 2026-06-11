export class CreateUserSettingsDto {
  userId: string;
  pushEnabled?: boolean;
  emailNotiEnabled?: boolean;
  cameraAutoOcr?: boolean | null;
  darkMode?: boolean | null;
  appLockEnabled?: boolean | null;
}
