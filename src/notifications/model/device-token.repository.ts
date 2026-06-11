import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DeviceToken } from '../entities/device-token.entity';
import { DeviceTokenRepository } from './device-token.interface';
import { CreateDeviceTokenDto } from '../dto/createDeviceToken.dto';

@Injectable()
export class TypeOrmDeviceTokenRepository implements DeviceTokenRepository {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly repo: Repository<DeviceToken>,
  ) {}

  async createToken(dto: CreateDeviceTokenDto): Promise<DeviceToken> {
    const token = this.repo.create(dto);
    return this.repo.save(token);
  }

  async findByUserId(userId: string): Promise<DeviceToken[]> {
    return this.repo.find({ where: { userId, isActive: true } });
  }

  async findByToken(token: string): Promise<DeviceToken | null> {
    return this.repo.findOne({ where: { token } });
  }

  async deactivateToken(tokenId: string): Promise<boolean> {
    const result = await this.repo.update({ tokenId }, { isActive: false });
    return (result.affected ?? 0) > 0;
  }

  async deactivateAllByUserId(userId: string): Promise<boolean> {
    const result = await this.repo.update({ userId }, { isActive: false });
    return (result.affected ?? 0) > 0;
  }

  async deleteToken(tokenId: string): Promise<boolean> {
    const result = await this.repo.delete({ tokenId });
    return (result.affected ?? 0) > 0;
  }
}
