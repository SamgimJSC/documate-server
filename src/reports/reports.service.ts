import { Inject, Injectable } from '@nestjs/common';

import { TypeOrmReportsRepository } from './model/reports.repository';
import { type ReportsRepository } from './model/reports.interface';

/*
  reports 모듈의 비즈니스 로직.
  - Repository에서 raw 집계 결과를 받아 응답 형태로 가공
  - 0-fill, percentage 계산 등 화면용 처리
*/
@Injectable()
export class ReportsService {
  constructor(
    @Inject(TypeOrmReportsRepository)
    private readonly reportsRepo: ReportsRepository,
  ) {}

  /*
    월별 지출 합계
    - 영수증 없는 달도 0으로 채워서 항상 12개월 반환
    - 그래프 그릴 때 X축이 깔끔하게 1~12월 다 나오게 하기 위함
  */
  async getMonthlySpend(userId: string, year?: number) {
    const targetYear = year ?? new Date().getFullYear();

    const rows = await this.reportsRepo.getMonthlyTotals(userId, targetYear);
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
    일별 지출 합계
    - 해당 월의 1일~말일을 0으로 채워서 반환
    - 영수증이 있는 날만 받아서 빈 날짜 채워주는 방식
  */
  async getDailySpend(userId: string, year?: number, month?: number) {
    const targetYear = year ?? new Date().getFullYear();
    const targetMonth = month ?? new Date().getMonth() + 1;

    const rows = await this.reportsRepo.getDailyTotals(
      userId,
      targetYear,
      targetMonth,
    );
    const rowMap = new Map(rows.map((r) => [r.day, r]));

    // 해당 월의 마지막 날 계산 (예: 2026년 2월 → 28일)
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();

    const days = Array.from({ length: lastDay }, (_, i) => {
      const day = i + 1;
      const found = rowMap.get(day);
      const dateStr = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        date: dateStr,
        day,
        totalSpend: found?.totalSpend ?? 0,
        receiptCount: found?.receiptCount ?? 0,
      };
    });

    const totalSpend = days.reduce((sum, d) => sum + d.totalSpend, 0);

    return { year: targetYear, month: targetMonth, totalSpend, days };
  }

  /*
    카테고리별 지출 요약
    - 세 가지 모드: year만 / year+month / date
    - 각 카테고리가 전체 지출의 몇 %인지(percentage) 함께 계산
  */
  async getCategorySummary(params: {
    userId: string;
    year?: number;
    month?: number;
    date?: string;
  }) {
    const { userId, year, month, date } = params;

    // date가 있으면 그날만, 없으면 year 기본값 채움
    const targetYear = date ? undefined : (year ?? new Date().getFullYear());

    const rows = await this.reportsRepo.getCategorySummary({
      userId,
      year: targetYear,
      month,
      date,
    });

    const totalSpend = rows.reduce((sum, r) => sum + r.totalSpend, 0);

    const categories = rows.map((r) => ({
      ...r,
      percentage:
        totalSpend === 0
          ? 0
          : Number(((r.totalSpend / totalSpend) * 100).toFixed(1)),
    }));

    return {
      year: targetYear ?? null,
      month: month ?? null,
      date: date ?? null,
      totalSpend,
      categories,
    };
  }
}