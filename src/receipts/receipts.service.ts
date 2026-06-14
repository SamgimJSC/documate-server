import { Inject, Injectable } from '@nestjs/common';

import { TypeOrmReceiptRepository } from './model/receipt.repository';
import { type ReceiptRepository } from './model/receipt.interface';

@Injectable()
export class ReceiptsService {
  constructor(
    @Inject(TypeOrmReceiptRepository)
    private readonly receiptRepo: ReceiptRepository,
  ) {}

  /*
    월별 지출 합계
    - 해당 연도 1~12월을 0으로 채워서 반환 (영수증 없는 달도 0으로 표시)
    - year 안 주면 현재 연도
  */
  async getMonthlySummary(userId: string, year?: number) {
    const targetYear = year ?? new Date().getFullYear();

    const rows = await this.receiptRepo.getMonthlyTotals(userId, targetYear);

    // DB에 있는 월만 들어있으니, Map으로 변환해서 1~12월 전부 채우기
    const rowMap = new Map(rows.map((r) => [r.month, r]));

    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const found = rowMap.get(month);

      return {
        month,
        totalSpend: found?.totalSpend ?? 0,
        receiptCount: found?.receiptCount ?? 0,
      };
    });

    const totalSpend = months.reduce((sum, m) => sum + m.totalSpend, 0);

    return { year: targetYear, totalSpend, months };
  }

  /*
    카테고리별 지출 요약
    - 비율(percentage) 계산해서 같이 반환
    - month 안 주면 해당 연도 전체
  */
  async getCategorySummary(userId: string, year?: number, month?: number) {
    const targetYear = year ?? new Date().getFullYear();

    const rows = await this.receiptRepo.getCategorySummary(
      userId,
      targetYear,
      month,
    );

    const totalSpend = rows.reduce((sum, r) => sum + r.totalSpend, 0);

    // 각 카테고리가 전체 지출에서 차지하는 비율 계산
    const categories = rows.map((r) => ({
      ...r,
      percentage:
        totalSpend === 0
          ? 0
          : Number(((r.totalSpend / totalSpend) * 100).toFixed(1)),
    }));

    return {
      year: targetYear,
      month: month ?? null,
      totalSpend,
      categories,
    };
  }
}