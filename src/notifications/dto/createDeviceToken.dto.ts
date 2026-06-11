import { Platform } from '../../global/constants/platform.enum';

export class CreateDeviceTokenDto {
  userId: string;
  token: string;
  platform: Platform;
}
