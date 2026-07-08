import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BiometricChallenge } from '../entities/biometric-challenge.entity';
import { BiometricChallengeRepository } from './biometric-challenge.interface';

@Injectable()
export class TypeOrmBiometricChallengeRepository implements BiometricChallengeRepository {
  constructor(
    @InjectRepository(BiometricChallenge)
    private readonly repo: Repository<BiometricChallenge>,
  ) {}

  async createChallenge(userId: string, challenge: string, expiresAt: Date): Promise<BiometricChallenge> {
    const record = this.repo.create({ userId, challenge, expiresAt });
    return this.repo.save(record);
  }

  async findByChallengeId(challengeId: string): Promise<BiometricChallenge | null> {
    return this.repo.findOne({ where: { challengeId } });
  }

  async markAsUsed(challengeId: string): Promise<void> {
    await this.repo.update({ challengeId }, { isUsed: true });
  }
}
