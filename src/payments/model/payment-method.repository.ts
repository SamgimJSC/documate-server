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

  async setDefault(userId: string, methodId: string): Promise<boolean> {
    await this.repo.update({ userId }, { isDefault: false });
    const result = await this.repo.update({ methodId }, { isDefault: true });
    return (result.affected ?? 0) > 0;
  }

  async deleteMethod(methodId: string): Promise<boolean> {
    const result = await this.repo.delete({ methodId });
    return (result.affected ?? 0) > 0;
  }
}
