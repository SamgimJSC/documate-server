import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { AuthTokenRepository } from './auth-token.interface';
import { AuthToken } from '../entities/auth-token.entity';
import { CreateAuthTokenDto } from '../dto/createAuthToken.dto';
import { UpdateAuthTokenDto } from '../dto/updateAuthToken.dto';

@Injectable()
export class TypeOrmAuthTokenRepository implements AuthTokenRepository {
  constructor(
    @InjectRepository(AuthToken)
    private readonly repo: Repository<AuthToken>,
  ) {}

  async createToken(
    createAuthTokenDto: CreateAuthTokenDto,
  ): Promise<AuthToken> {
    const token = this.repo.create(createAuthTokenDto);
    return this.repo.save(token);
  }

  async findByTokenId(tokenId: string): Promise<AuthToken | null> {
    return this.repo.findOne({ where: { tokenId } });
  }

  async findByUserId(userId: string): Promise<AuthToken[]> {
    return this.repo.find({ where: { userId } });
  }

  async findByRefreshToken(refreshToken: string): Promise<AuthToken | null> {
    return this.repo.findOne({ where: { refreshToken } });
  }

  async updateToken(
    tokenId: string,
    updateAuthTokenDto: UpdateAuthTokenDto,
  ): Promise<AuthToken | null> {
    const token = await this.findByTokenId(tokenId);
    if (!token) return null;

    Object.assign(token, updateAuthTokenDto);
    return this.repo.save(token);
  }

  async deleteByTokenId(tokenId: string): Promise<boolean> {
    const result = await this.repo.delete({ tokenId });
    return (result.affected ?? 0) > 0;
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    const result = await this.repo.delete({ userId });
    return (result.affected ?? 0) > 0;
  }
}
