import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Receipt } from '../../receipts/entities/receipt.entity';
import {
  CategorySummary,
  DailyTotal,
  MonthlyTotal,
  ReportsRepository,
} from './reports.interface';

/*
  reports 모듈의 데이터 접근 계층.
  영수증(receipts) 테이블을 읽어서 GROUP BY로 집계만 함.
  영수증 자체의 CRUD는 receipts 모듈이 담당.
*/
@Injectable()
export class TypeOrmReportsRepository implements ReportsRepository {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
  ) {}

  /*
    월별 지출 합계 (1~12월)
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
    const rows = await this.receiptRepo
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

    // DB는 숫자도 문자열로 돌려주는 경우가 있어서 Number()로 변환
    return rows.map((row) => ({
      month: Number(row.month),
      totalSpend: Number(row.total),
      receiptCount: Number(row.count),
    }));
  }

  /*
    일별 지출 합계 (특정 연도/월의 1일~말일)
    날짜를 그대로 GROUP BY 키로 사용.
  */
  async getDailyTotals(
    userId: string,
    year: number,
    month: number,
  ): Promise<DailyTotal[]> {
    const rows = await this.receiptRepo
      .createQueryBuilder('r')
      .select('r.purchase_date', 'date')
      .addSelect('EXTRACT(DAY FROM r.purchase_date)', 'day')
      .addSelect('SUM(r.total_amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('r.userId = :userId', { userId })
      .andWhere('r.isDeleted = false')
      .andWhere('EXTRACT(YEAR FROM r.purchase_date) = :year', { year })
      .andWhere('EXTRACT(MONTH FROM r.purchase_date) = :month', { month })
      .groupBy('r.purchase_date')
      .orderBy('r.purchase_date', 'ASC')
      .getRawMany<{ date: Date; day: string; total: string; count: string }>();

    return rows.map((row) => ({
      // DB에서 받은 Date 객체를 "YYYY-MM-DD" 형식 문자열로 변환
      date: this.toIsoDate(row.date),
      day: Number(row.day),
      totalSpend: Number(row.total),
      receiptCount: Number(row.count),
    }));
  }

  /*
    카테고리별 지출 요약
    - 세 가지 모드: year만 / year+month / date 단일
    - spend_categories 테이블 LEFT JOIN해서 카테고리명/아이콘 같이 가져옴
  */
  async getCategorySummary(params: {
    userId: string;
    year?: number;
    month?: number;
    date?: string;
  }): Promise<CategorySummary[]> {
    const { userId, year, month, date } = params;

    const qb = this.receiptRepo
      .createQueryBuilder('r')
      .leftJoin('r.spendCategory', 'c')
      .select('r.spend_category_id', 'spendCategoryId')
      .addSelect('c.name', 'categoryName')
      .addSelect('c.icon', 'icon')
      .addSelect('SUM(r.total_amount)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('r.userId = :userId', { userId })
      .andWhere('r.isDeleted = false');

    // 필터링: date가 있으면 그날만, 아니면 year/month로
    if (date) {
      qb.andWhere('r.purchase_date = :date', { date });
    } else if (year) {
      qb.andWhere('EXTRACT(YEAR FROM r.purchase_date) = :year', { year });
      if (month) {
        qb.andWhere('EXTRACT(MONTH FROM r.purchase_date) = :month', { month });
      }
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

  /*
    [내부 헬퍼] Date 객체를 "YYYY-MM-DD" 문자열로 변환
    DB의 DATE 타입은 시간 정보가 없는데, JS는 Date 객체로 받으면서
    타임존 변환 때문에 하루 차이가 날 수 있음. 안전하게 UTC 기준 처리.
  */
  private toIsoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}