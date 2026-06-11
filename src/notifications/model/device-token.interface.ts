import { CreateDeviceTokenDto } from '../dto/createDeviceToken.dto';
import { DeviceToken } from '../entities/device-token.entity';

export interface DeviceTokenRepository {
  createToken(dto: CreateDeviceTokenDto): Promise<DeviceToken>;
  findByUserId(userId: string): Promise<DeviceToken[]>;
  findByToken(token: string): Promise<DeviceToken | null>;
  deactivateToken(tokenId: string): Promise<boolean>;
  deactivateAllByUserId(userId: string): Promise<boolean>;
  deleteToken(tokenId: string): Promise<boolean>;
}
