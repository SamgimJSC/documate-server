import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { TypeOrmUserRepository } from './users.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  exports: [TypeOrmModule, UsersService],
  providers: [UsersService, TypeOrmUserRepository],
})
export class UsersModule {}
