import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserSettings } from '../entities/user-settings.entity';
import { UserSettingsRepository } from './user-settings.interface';
import { CreateUserSettingsDto } from '../dto/createUserSettings.dto';
import { UpdateUserSettingsDto } from '../dto/updateUserSettings.dto';

@Injectable()
export class TypeOrmUserSettingsRepository implements UserSettingsRepository {
  constructor(
    @InjectRepository(UserSettings)
    private readonly repo: Repository<UserSettings>,
  ) {}

  async createSettings(dto: CreateUserSettingsDto): Promise<UserSettings> {
    const settings = this.repo.create(dto);
    return this.repo.save(settings);
  }

  async findByUserId(userId: string): Promise<UserSettings | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async updateSettings(
    userId: string,
    dto: UpdateUserSettingsDto,
  ): Promise<UserSettings | null> {
    const settings = await this.findByUserId(userId);
    if (!settings) return null;

    Object.assign(settings, dto);
    return this.repo.save(settings);
  }
}
