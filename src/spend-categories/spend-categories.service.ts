import { Inject, Injectable } from '@nestjs/common';

import { TypeOrmSpendCategoryRepository } from '../receipts/model/spend-category.repository';
import { type SpendCategoryRepository } from '../receipts/model/spend-category.interface';

/*
  소비 카테고리 로직
*/
@Injectable()
export class SpendCategoriesService {
  constructor(
    @Inject(TypeOrmSpendCategoryRepository)
    private readonly spendCategoryRepo: SpendCategoryRepository,
  ) {}

  /*
    전체 카테고리 목록 조회
    - 응답을 { categories: [...] } 형태로 감싸서 반환
  */
  async getAllCategories() {
    const categories = await this.spendCategoryRepo.findAll();
    return { categories };
  }
}