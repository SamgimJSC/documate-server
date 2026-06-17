import { Controller, Get, UseGuards } from '@nestjs/common';

import { SpendCategoriesService } from './spend-categories.service';
import { JwtAuthGuard } from '../auth/auth.guard';

/*
  소비 카테고리 API
  - 영수증 등록/수정/조회 시 카테고리 선택용
  - 로그인된 사용자라면 누구나 조회 가능
*/
@UseGuards(JwtAuthGuard)
@Controller('spend-categories')
export class SpendCategoriesController {
  constructor(
    private readonly spendCategoriesService: SpendCategoriesService,
  ) {}

  // ====================================================================
  // GET /spend-categories
  // 전체 소비 카테고리 목록 조회
  // ====================================================================
  @Get()
  getAllCategories() {
    return this.spendCategoriesService.getAllCategories();
  }
}