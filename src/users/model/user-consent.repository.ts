import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserConsent } from '../entities/user-consent.entity';
import { UserConsentRepository } from './user-consent.interface';
import { CreateUserConsentDto } from '../dto/createUserConsent.dto';
import { UpdateUserConsentDto } from '../dto/updateUserConsent.dto';
import { ConsentType } from '../../global/constants/consentType.enum';

@Injectable()
export class TypeOrmUserConsentRepository implements UserConsentRepository {
  constructor(
    @InjectRepository(UserConsent)
    private readonly repo: Repository<UserConsent>,
  ) {}

  async createConsent(dto: CreateUserConsentDto): Promise<UserConsent> {
    const consent = this.repo.create(dto);
    return this.repo.save(consent);
  }

  async findByUserId(userId: string): Promise<UserConsent[]> {
    return this.repo.find({ where: { userId } });
  }

  async findByUserIdAndType(
    userId: string,
    consentType: ConsentType,
  ): Promise<UserConsent | null> {
    return this.repo.findOne({ where: { userId, consentType } });
  }

  async updateConsent(
    userId: string,
    consentType: ConsentType,
    dto: UpdateUserConsentDto,
  ): Promise<UserConsent | null> {
    const consent = await this.findByUserIdAndType(userId, consentType);
    if (!consent) return null;

    Object.assign(consent, dto);
    return this.repo.save(consent);
  }

  async bulkUpsert(
    userId: string,
    dtos: CreateUserConsentDto[],
  ): Promise<UserConsent[]> {
    const results: UserConsent[] = [];
    for (const dto of dtos) {
      const existing = await this.findByUserIdAndType(userId, dto.consentType);
      if (existing) {
        Object.assign(existing, {
          isAgreed: dto.isAgreed,
          agreedAt: dto.agreedAt,
        });
        results.push(await this.repo.save(existing));
      } else {
        results.push(await this.createConsent({ ...dto, userId }));
      }
    }
    return results;
  }
}
