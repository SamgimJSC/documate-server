export class CreateAuthTokenDto {
  userId: string;
  refreshToken: string;
  deviceInfo?: string;
  expiresAt: Date;
}
