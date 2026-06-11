import { UserSettings } from '../entities/user-settings.entity';
import { CreateUserSettingsDto } from '../dto/createUserSettings.dto';
import { UpdateUserSettingsDto } from '../dto/updateUserSettings.dto';

export interface UserSettingsRepository {
  createSettings(dto: CreateUserSettingsDto): Promise<UserSettings>;
  findByUserId(userId: string): Promise<UserSettings | null>;
  updateSettings(
    userId: string,
    dto: UpdateUserSettingsDto,
  ): Promise<UserSettings | null>;
}
