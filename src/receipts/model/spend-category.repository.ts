import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { SpendCategory } from '../entities/spend-category.entity';
import { SpendCategoryRepository } from './spend-category.interface';

@Injectable()
export class TypeOrmSpendCategoryRepository implements SpendCategoryRepository {
  constructor(
    @InjectRepository(SpendCategory)
    private readonly repo: Repository<SpendCategory>,
  ) {}

  async findAll(): Promise<SpendCategory[]> {
    return this.repo.find();
  }

  async findById(spendCategoryId: number): Promise<SpendCategory | null> {
    return this.repo.findOne({ where: { spendCategoryId } });
  }
}
