import { MonthlyReport } from '../entities/monthly-report.entity';

export class UpsertMonthlyReportDto {
  userId: string;
  reportYear: number;
  reportMonth: number;
  totalSpend?: number;
  receiptCount?: number;
  prevMonthDiffPct?: number | null;
  predictedSpend?: number | null;
  predictionConfidence?: number | null;
  categoryBreakdown?: Record<string, any> | null;
  aiAnalysis?: string | null;
}

export interface MonthlyReportRepository {
  upsertReport(dto: UpsertMonthlyReportDto): Promise<MonthlyReport>;
  findByUserId(userId: string): Promise<MonthlyReport[]>;
  findByUserIdAndPeriod(
    userId: string,
    reportYear: number,
    reportMonth: number,
  ): Promise<MonthlyReport | null>;
}
