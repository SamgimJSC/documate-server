import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/createUser.dto';
import { GetUsersQueryDto } from './dto/getUsersQuery.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import type { UpdateUserSettingsDto } from './dto/updateUserSettings.dto';
import { UpdatePinDto } from './dto/updatePin.dto';
import { UpdateNicknameDto } from './dto/updateNickname.dto';
import { TypeOrmUserRepository } from './model/users.repository';
import { type UserRepository } from './model/users.interface';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { EUnauthorizedException } from '../global/exceptions/EUnauthorizedException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { EConflictException } from '../global/exceptions/EConflictException';
import { EBadRequestException } from '../global/exceptions/EBadRequestException';
import { TypeOrmUserSecurityRepository } from './model/user-security.repository';
import { type UserSecurityRepository } from './model/user-security.interface';
import { TypeOrmUserSettingsRepository } from './model/user-settings.repository';
import { type UserSettingsRepository } from './model/user-settings.interface';
import { Transactional } from 'typeorm-transactional';
import * as bcrypt from 'bcrypt';
import { rNickname } from '../global/reg';
import type { BiometricType } from '../global/constants/biometricType.enum';
import { PIN_MAX_FAILED_ATTEMPTS } from '../global/constants/pin.const';
import { UserPlan } from '../global/constants/userPlan.enum';

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

  async updateMyNickname(userId: string, dto: UpdateNicknameDto) {
    if (typeof dto.nickname !== 'string') {
      throw new EBadRequestException({
        message: 'Invalid nickname.',
        errorCode: ERROR_CODE.INVALID_NICKNAME,
      });
    }

    const nickname = dto.nickname.trim();

    if (!rNickname.test(nickname)) {
      throw new EBadRequestException({
        message:
          'Nickname must be 2-8 characters and contain only Korean or English letters.',
        errorCode: ERROR_CODE.INVALID_NICKNAME,
      });
    }

    const updated = await this.updateUser(userId, { nickname });

    return { success: true, nickname: updated.nickname };
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

  async getUserSettings(userId: string) {
    const settings = await this.userSettingsRepo.findByUserId(userId);

    if (!settings)
      throw new ENotFoundException({
        message: '사용자 설정을 찾을 수 없습니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });

    return settings;
  }

  async updateUserSettings(userId: string, dto: UpdateUserSettingsDto) {
    const updated = await this.userSettingsRepo.updateSettings(userId, dto);

    if (!updated)
      throw new ENotFoundException({
        message: '사용자 설정을 찾을 수 없습니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });

    return updated;
  }

  /*
    PIN 검증 (문서 잠금 열람/설정, 마이페이지 PIN 확인 등 모든 곳에서 공용으로 사용)
    - loginWithPin과 동일하게 pinFailedCount를 누적/초기화함
    - 예외 없이 항상 lockout을 적용해야 세션 탈취 시 무제한 브루트포스를 막을 수 있음
  */
  async verifyPin(userId: string, pinNumber: string): Promise<void> {
    const security = await this.userSecurityRepo.findByUserId(userId);

    if (!security || !security.pinHash)
      throw new EUnauthorizedException({
        message: 'PIN이 설정되어 있지 않습니다.',
        errorCode: ERROR_CODE.PIN_NOT_SET,
      });

    if (security.pinFailedCount >= PIN_MAX_FAILED_ATTEMPTS)
      throw new EUnauthorizedException({
        message: 'PIN 입력 횟수를 초과했습니다. 이메일 로그인을 이용해주세요.',
        errorCode: ERROR_CODE.PIN_LOCKED,
      });

    const isValid = await bcrypt.compare(pinNumber, security.pinHash);

    if (!isValid) {
      await this.userSecurityRepo.incrementPinFailedCount(userId);
      throw new EUnauthorizedException({
        message: 'PIN이 일치하지 않습니다.',
        errorCode: ERROR_CODE.INVALID_PIN,
      });
    }

    await this.userSecurityRepo.resetPinFailedCount(userId);
  }

  async updatePin(userId: string, updatePinDto: UpdatePinDto) {
    const security = await this.userSecurityRepo.findByUserId(userId);

    if (!security || !security.pinHash)
      throw new EUnauthorizedException({
        message: 'PIN이 설정되어 있지 않습니다.',
        errorCode: ERROR_CODE.PIN_NOT_SET,
      });

    const isValid = await bcrypt.compare(
      updatePinDto.currentPin,
      security.pinHash,
    );

    if (!isValid)
      throw new EUnauthorizedException({
        message: '현재 PIN이 일치하지 않습니다.',
        errorCode: ERROR_CODE.INVALID_PIN,
      });

    const newPinHash = await bcrypt.hash(updatePinDto.newPin, 10);

    await this.userSecurityRepo.updateSecurity(userId, {
      pinHash: newPinHash,
      pinUpdatedAt: new Date(),
      pinFailedCount: 0,
    });
  }

  async updateBiometric(
    userId: string,
    biometricEnabled: boolean,
    biometricType: BiometricType | null,
    publicKey: string | null,
  ) {
    const updated = await this.userSecurityRepo.updateSecurity(userId, {
      biometricEnabled,
      biometricType,
      publicKey,
    });

    if (!updated)
      throw new ENotFoundException({
        message: '존재하지 않는 계정입니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });

    return updated;
  }

  async incrementPinFailedCount(userId: string) {
    return this.userSecurityRepo.incrementPinFailedCount(userId);
  }

  async resetPinFailedCount(userId: string) {
    return this.userSecurityRepo.resetPinFailedCount(userId);
  }

  async addStorageUsedBytes(userId: string, bytes: number) {
    await this.userRepo.incrementStorageUsedBytes(userId, bytes);
  }

  async subtractStorageUsedBytes(userId: string, bytes: number) {
    await this.userRepo.decrementStorageUsedBytes(userId, bytes);
  }

  async updatePlanAndStorageQuota(userId: string, plan: UserPlan) {
    const updated = await this.userRepo.updatePlanAndStorageQuota(userId, plan);

    if (!updated) {
      throw new ENotFoundException({
        message: '사용자를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });
    }

    return updated;
  }
}
