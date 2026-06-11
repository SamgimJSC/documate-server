import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserSecurity } from '../entities/user-security.entity';
import { UserSecurityRepository } from './user-security.interface';
import { CreateUserSecurityDto } from '../dto/createUserSecurity.dto';
import { UpdateUserSecurityDto } from '../dto/updateUserSecurity.dto';

@Injectable()
export class TypeOrmUserSecurityRepository implements UserSecurityRepository {
  constructor(
    @InjectRepository(UserSecurity)
    private readonly repo: Repository<UserSecurity>,
  ) {}

  async createSecurity(dto: CreateUserSecurityDto): Promise<UserSecurity> {
    const security = this.repo.create(dto);
    return this.repo.save(security);
  }

  async findByUserId(userId: string): Promise<UserSecurity | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async findBySecurityId(securityId: string): Promise<UserSecurity | null> {
    return this.repo.findOne({ where: { securityId } });
  }

  async updateSecurity(
    userId: string,
    dto: UpdateUserSecurityDto,
  ): Promise<UserSecurity | null> {
    const security = await this.findByUserId(userId);
    if (!security) return null;

    Object.assign(security, dto);
    return this.repo.save(security);
  }

  async incrementPinFailedCount(userId: string): Promise<boolean> {
    const result = await this.repo.increment({ userId }, 'pinFailedCount', 1);
    return (result.affected ?? 0) > 0;
  }

  async resetPinFailedCount(userId: string): Promise<boolean> {
    const result = await this.repo.update({ userId }, { pinFailedCount: 0 });
    return (result.affected ?? 0) > 0;
  }
}
