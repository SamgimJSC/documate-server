/*
  reports 모듈에서 사용하는 집계 결과 타입과 Repository 시그니처.

  영수증 데이터(receipts 테이블)에서 GROUP BY로 집계해서 만들어내는 값들.
*/

/*
  월별 집계 결과 한 줄
  - month: 1~12
  - totalSpend: 해당 월 총 지출
  - receiptCount: 해당 월 영수증 건수
*/
export interface MonthlyTotal {
  month: number;
  totalSpend: number;
  receiptCount: number;
}

/*
  일별 집계 결과 한 줄
  - date: "2026-06-09" 형식
  - day: 1~31
  - totalSpend, receiptCount: 해당 날짜의 총합
*/
export interface DailyTotal {
  date: string;
  day: number;
  totalSpend: number;
  receiptCount: number;
}

/*
  카테고리별 집계 결과 한 줄
  - 카테고리 없는(null) 영수증도 한 줄로 묶여 반환됨 (미분류)
*/
export interface CategorySummary {
  spendCategoryId: number | null;
  categoryName: string | null;
  icon: string | null;
  totalSpend: number;
  receiptCount: number;
}

/*
  대시보드 이번달 요약
*/
export interface ThisMonthSummary {
  year: number;
  month: number;
  totalSpend: number;
  receiptCount: number;
}

/*
  상점별 집계 결과 한 줄 (TOP 방문 매장)
  - totalSpend 기준 내림차순으로 반환됨
*/
export interface TopStoreTotal {
  storeName: string;
  totalSpend: number;
  visitCount: number;
}

/*
  요일별 집계 결과 한 줄
  - weekday: 0(일)~6(토), PostgreSQL EXTRACT(DOW ...)와 동일한 규칙
*/
export interface WeekdayTotal {
  weekday: number;
  totalSpend: number;
  receiptCount: number;
}

export interface ReportsRepository {
  // 월별 합계 (특정 연도)
  getMonthlyTotals(userId: string, year: number): Promise<MonthlyTotal[]>;

  // 일별 합계 (특정 연도/월)
  getDailyTotals(
    userId: string,
    year: number,
    month: number,
  ): Promise<DailyTotal[]>;

  // 카테고리별 요약
  // 세 가지 모드 지원:
  //   1) year + month   → 해당 월
  //   2) year만          → 해당 연도 전체
  //   3) date            → 특정 하루
  getCategorySummary(params: {
    userId: string;
    year?: number;
    month?: number;
    date?: string;
  }): Promise<CategorySummary[]>;

  // 대시보드용 이번달 총 지출 + 영수증 건수
  getThisMonthSummary(
    userId: string,
    year: number,
    month: number,
  ): Promise<ThisMonthSummary>;

  // TOP 방문 매장 (year만 / year+month, totalSpend 내림차순 limit개)
  getTopStores(params: {
    userId: string;
    year?: number;
    month?: number;
    limit: number;
  }): Promise<TopStoreTotal[]>;

  // 요일별 합계 (특정 연도)
  getWeekdayTotals(userId: string, year: number): Promise<WeekdayTotal[]>;
}