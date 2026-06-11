import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThan, Repository } from 'typeorm';

import { EmailVerification } from '../entities/email-verification.entity';
import { CreateEmailVerificationDto } from '../dto/createEmailVerification.dto';
import { EmailVerificationRepository } from './email-verification.interface';
import { VerificationPurpose } from '../../global/constants/verificationPurpose.enum';

@Injectable()
export class TypeOrmEmailVerificationRepository implements EmailVerificationRepository {
  constructor(
    @InjectRepository(EmailVerification)
    private readonly repo: Repository<EmailVerification>,
  ) {}

  async createVerification(
    dto: CreateEmailVerificationDto,
  ): Promise<EmailVerification> {
    const verification = this.repo.create(dto);
    return this.repo.save(verification);
  }

  async findByVerificationId(
    verificationId: string,
  ): Promise<EmailVerification | null> {
    return this.repo.findOne({ where: { verificationId } });
  }

  async findActiveByEmailAndPurpose(
    email: string,
    purpose: VerificationPurpose,
  ): Promise<EmailVerification[]> {
    return this.repo.find({
      where: {
        email,
        purpose,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
    });
  }

  async markAsUsed(verificationId: string): Promise<EmailVerification | null> {
    const verification = await this.findByVerificationId(verificationId);
    if (!verification) return null;

    verification.isUsed = true;
    return this.repo.save(verification);
  }

  async deleteByEmail(email: string): Promise<boolean> {
    const result = await this.repo.delete({ email });
    return (result.affected ?? 0) > 0;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repo.delete({ expiresAt: LessThan(new Date()) });
    return result.affected ?? 0;
  }
}
