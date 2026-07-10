import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaymentMethod } from '../entities/payment-method.entity';
import { PaymentMethodRepository } from './payment-method.interface';
import { CreatePaymentMethodDto } from '../dto/createPaymentMethod.dto';

@Injectable()
export class TypeOrmPaymentMethodRepository implements PaymentMethodRepository {
  constructor(
    @InjectRepository(PaymentMethod)
    private readonly repo: Repository<PaymentMethod>,
  ) {}

  async createMethod(dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    const method = this.repo.create(dto);
    return this.repo.save(method);
  }

  async findByMethodId(methodId: string): Promise<PaymentMethod | null> {
    return this.repo.findOne({ where: { methodId } });
  }

  async findByUserId(userId: string): Promise<PaymentMethod[]> {
    return this.repo.find({ where: { userId } });
  }

  async findDefaultByUserId(userId: string): Promise<PaymentMethod | null> {
    return this.repo.findOne({ where: { userId, isDefault: true } });
  }

  async setDefault(userId: string, methodId: string): Promise<boolean> {
    await this.repo
      .createQueryBuilder()
      .update(PaymentMethod)
      .set({ isDefault: () => 'method_id = :methodId' })
      .where('user_id = :userId', { userId, methodId })
      .execute();

    const updated = await this.repo.findOne({
      where: { userId, methodId, isDefault: true },
    });
    return Boolean(updated);
  }

  async deleteMethod(methodId: string): Promise<boolean> {
    const result = await this.repo.delete({ methodId });
    return (result.affected ?? 0) > 0;
  }
}
