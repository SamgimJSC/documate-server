import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from './user.entity';
import { UserRepository } from './users.interface';
import { CreateUserDto } from './dto/createUser.dto';
import { GetUsersQueryDto } from './dto/getUsersQuery.dto';
import { UpdateUserDto } from './dto/updateUser.dto';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    const user = this.repo.create(createUserDto);
    return this.repo.save(user);
  }

  async findAll(query: GetUsersQueryDto): Promise<User[]> {
    const qb = this.repo
      .createQueryBuilder('user')
      .where('user.isDeleted = :isDeleted', { isDeleted: 'N' });

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
