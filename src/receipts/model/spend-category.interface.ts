import { SpendCategory } from '../entities/spend-category.entity';

export interface SpendCategoryRepository {
  findAll(): Promise<SpendCategory[]>;
  findById(spendCategoryId: number): Promise<SpendCategory | null>;
}
