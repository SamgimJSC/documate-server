import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserSecurity } from './entities/user-security.entity';
import { UserSettings } from './entities/user-settings.entity';
import { TypeOrmUserRepository } from './model/users.repository';
import { TypeOrmUserSecurityRepository } from './model/user-security.repository';
import { TypeOrmUserSettingsRepository } from './model/user-settings.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserSecurity, UserSettings])],
  controllers: [UsersController],
  exports: [TypeOrmModule, UsersService],
  providers: [
    UsersService,
    TypeOrmUserRepository,
    TypeOrmUserSecurityRepository,
    TypeOrmUserSettingsRepository,
  ],
})
export class UsersModule {}
