import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/createUser.dto';
import { GetUsersQueryDto } from './dto/getUsersQuery.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { TypeOrmUserRepository } from './model/users.repository';
import { type UserRepository } from './model/users.interface';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { EConflictException } from '../global/exceptions/EConflictException';
import { TypeOrmUserSecurityRepository } from './model/user-security.repository';
import { type UserSecurityRepository } from './model/user-security.interface';
import { TypeOrmUserSettingsRepository } from './model/user-settings.repository';
import { type UserSettingsRepository } from './model/user-settings.interface';
import { Transactional } from 'typeorm-transactional';

@Injectable()
export class UsersService {
  constructor(
    @Inject(TypeOrmUserRepository)
    private readonly userRepo: UserRepository,
    @Inject(TypeOrmUserSecurityRepository)
    private readonly userSecurityRepo: UserSecurityRepository,
    @Inject(TypeOrmUserSettingsRepository)
    private readonly userSettingsRepo: UserSettingsRepository,
  ) {}

  async getUsers(query: GetUsersQueryDto) {
    return this.userRepo.findAll(query);
  }

  async getOneUser(userId: string) {
    const user = await this.userRepo.findUser(userId);

    if (!user)
      throw new ENotFoundException({
        message: '사용자를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });

    return user;
  }

  @Transactional()
  async createUser(createUserDto: CreateUserDto, pinHash?: string) {
    const existing = await this.userRepo.findByEmail(createUserDto.email);

    if (existing)
      throw new EConflictException({
        message: '이미 사용 중인 이메일입니다.',
        errorCode: ERROR_CODE.EMAIL_ALREADY_USED,
      });

    const createdUser = await this.userRepo.createUser(createUserDto);

    const { userId } = createdUser;

    await this.userSecurityRepo.createSecurity({ userId, pinHash });

    await this.userSettingsRepo.createSettings({ userId });

    return createdUser;
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.email) {
      const existing = await this.userRepo.findByEmail(updateUserDto.email);

      if (existing && existing.userId !== userId) {
        throw new EConflictException({
          message: '이미 사용 중인 이메일입니다.',
          errorCode: ERROR_CODE.EMAIL_ALREADY_USED,
        });
      }
    }

    const updated = await this.userRepo.updateUser(userId, updateUserDto);

    if (!updated)
      throw new ENotFoundException({
        message: '사용자를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });

    return updated;
  }

  async deleteUser(userId: string, withdrawalReason?: string) {
    const deleted: boolean = await this.userRepo.softDeleteUser(
      userId,
      withdrawalReason,
    );

    if (!deleted)
      throw new ENotFoundException({
        message: '사용자를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });
  }

  async getUserSecurity(userId: string) {
    return this.userSecurityRepo.findByUserId(userId);
  }

  async addStorageUsedBytes(userId: string, bytes: number) {
    await this.userRepo.incrementStorageUsedBytes(userId, bytes);
  }

  async subtractStorageUsedBytes(userId: string, bytes: number) {
    await this.userRepo.decrementStorageUsedBytes(userId, bytes);
  }
}
