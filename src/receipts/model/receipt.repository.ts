import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Receipt } from '../entities/receipt.entity';
import {
  CategorySummary,
  MonthlyTotal,
  ReceiptRepository,
} from './receipt.interface';
import { CreateReceiptDto } from '../dto/createReceipt.dto';
import { UpdateReceiptDto } from '../dto/updateReceipt.dto';

@Injectable()
export class TypeOrmReceiptRepository implements ReceiptRepository {
  constructor(
    @InjectRepository(Receipt)
    private readonly repo: Repository<Receipt>,
  ) {}


  async createReceipt(dto: CreateReceiptDto): Promise<Receipt> {
    const receipt = this.repo.create(dto);
    return this.repo.save(receipt);
  }

  async findByReceiptId(receiptId: string): Promise<Receipt | null> {
    return this.repo.findOne({ where: { receiptId, isDeleted: false } });
  }

  async findByUserId(userId: string): Promise<Receipt[]> {
    return this.repo.find({ where: { userId, isDeleted: false } });
  }

  async updateReceipt(
    receiptId: string,
    dto: UpdateReceiptDto,
  ): Promise<Receipt | null> {
    const receipt = await this.findByReceiptId(receiptId);
    if (!receipt) return null;

    Object.assign(receipt, dto);
    return this.repo.save(receipt);
  }

  async softDeleteReceipt(receiptId: string): Promise<boolean> {
    const receipt = await this.findByReceiptId(receiptId);
    if (!receipt) return false;

    receipt.isDeleted = true;
    await this.repo.save(receipt);
    return true;
  }
  
   /*
    해당 연도의 월별 지출 합계 조회

    SQL로 풀어보면:
    SELECT EXTRACT(MONTH FROM purchase_date) AS month,
           SUM(total_amount) AS total,
           COUNT(*) AS count
    FROM receipts
    WHERE user_id = ? AND is_deleted = false
      AND EXTRACT(YEAR FROM purchase_date) = ?
    GROUP BY month
    ORDER BY month ASC
  */
  async getMonthlyTotals(
    userId: string,
    year: number,
  ): Promise<MonthlyTotal[]> {
    const rows = await this.repo
      .createQueryBuilder('r')
      .select('EXTRACT(MONTH FROM r.purchase_date)', 'month')
      .addSelect('SUM(r.total_amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('r.userId = :userId', { userId })
      .andWhere('r.isDeleted = false')
      .andWhere('EXTRACT(YEAR FROM r.purchase_date) = :year', { year })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany<{ month: string; total: string; count: string }>();

    // DB는 숫자를 문자열로 돌려주는 경우가 있어서 Number()로 변환
    return rows.map((row) => ({
      month: Number(row.month),
      totalSpend: Number(row.total),
      receiptCount: Number(row.count),
    }));
  }

  /*
    카테고리별 지출 요약 조회
    - month가 있으면 해당 월만, 없으면 해당 연도 전체
    - 카테고리명/아이콘은 spend_categories 테이블 LEFT JOIN으로 가져옴
  */
  async getCategorySummary(
    userId: string,
    year: number,
    month?: number,
  ): Promise<CategorySummary[]> {
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoin('r.spendCategory', 'c')
      .select('r.spend_category_id', 'spendCategoryId')
      .addSelect('c.name', 'categoryName')
      .addSelect('c.icon', 'icon')
      .addSelect('SUM(r.total_amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('r.userId = :userId', { userId })
      .andWhere('r.isDeleted = false')
      .andWhere('EXTRACT(YEAR FROM r.purchase_date) = :year', { year });

    if (month) {
      qb.andWhere('EXTRACT(MONTH FROM r.purchase_date) = :month', { month });
    }

    const rows = await qb
      .groupBy('r.spend_category_id')
      .addGroupBy('c.name')
      .addGroupBy('c.icon')
      .orderBy('total', 'DESC')
      .getRawMany<{
        spendCategoryId: string | null;
        categoryName: string | null;
        icon: string | null;
        total: string;
        count: string;
      }>();

    return rows.map((row) => ({
      spendCategoryId:
        row.spendCategoryId === null ? null : Number(row.spendCategoryId),
      categoryName: row.categoryName,
      icon: row.icon,
      totalSpend: Number(row.total),
      receiptCount: Number(row.count),
    }));
  }
}

