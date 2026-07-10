import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from '../entities/user.entity';
import { UserRepository } from './users.interface';
import { CreateUserDto } from '../dto/createUser.dto';
import { GetUsersQueryDto } from '../dto/getUsersQuery.dto';
import { UpdateUserDto } from '../dto/updateUser.dto';
import { UserPlan } from '../../global/constants/userPlan.enum';
import { STORAGE_QUOTA_BYTES } from '../../global/constants/storageQuota.const';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = this.repo.create({
      ...createUserDto,
      storageUsedBytes: '0',
      storageQuotaBytes: STORAGE_QUOTA_BYTES[UserPlan.FREE],
    });
    return this.repo.save(user);
  }

  async findAll(query: GetUsersQueryDto): Promise<User[]> {
    const qb = this.repo
      .createQueryBuilder('user')
      .where('user.isDeleted = :isDeleted', { isDeleted: false });

    if (query.email) {
      qb.andWhere('user.email ILIKE :email', { email: `%${query.email}%` });
    }

    if (query.nickname) {
      qb.andWhere('user.nickname ILIKE :nickname', {
        nickname: `%${query.nickname}%`,
      });
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.plan) {
      qb.andWhere('user.plan = :plan', { plan: query.plan });
    }

    return qb.getMany();
  }

  async findUser(userId: string): Promise<User | null> {
    return this.repo.findOne({
      where: { userId, isDeleted: false },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email, isDeleted: false },
    });
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User | null> {
    const user = await this.findUser(userId);
    if (!user) return null;

    Object.assign(user, updateUserDto);
    return this.repo.save(user);
  }

  async updatePlanAndStorageQuota(
    userId: string,
    plan: UserPlan,
  ): Promise<User | null> {
    const user = await this.findUser(userId);
    if (!user) return null;

    user.plan = plan;
    user.storageQuotaBytes = STORAGE_QUOTA_BYTES[plan];
    return this.repo.save(user);
  }

  async incrementStorageUsedBytes(
    userId: string,
    bytes: number,
  ): Promise<void> {
    // 읽고-쓰기 대신 DB 레벨 원자적 증가로 동시 업로드 경합을 방지한다.
    await this.repo
      .createQueryBuilder()
      .update(User)
      .set({ storageUsedBytes: () => 'storage_used_bytes + :bytes' })
      .where('user_id = :userId', { userId })
      .setParameter('bytes', bytes)
      .execute();
  }

  async decrementStorageUsedBytes(
    userId: string,
    bytes: number,
  ): Promise<void> {
    // 음수로 내려가지 않도록 GREATEST(0, ...) 로 클램프한다.
    await this.repo
      .createQueryBuilder()
      .update(User)
      .set({
        storageUsedBytes: () => 'GREATEST(0, storage_used_bytes - :bytes)',
      })
      .where('user_id = :userId', { userId })
      .setParameter('bytes', bytes)
      .execute();
  }

  async softDeleteUser(
    userId: string,
    withdrawalReason?: string,
  ): Promise<boolean> {
    const user = await this.findUser(userId);
    if (!user) return false;

    user.isDeleted = true;
    user.deletedAt = new Date();
    if (withdrawalReason) user.withdrawalReason = withdrawalReason;

    await this.repo.save(user);
    return true;
  }
}
