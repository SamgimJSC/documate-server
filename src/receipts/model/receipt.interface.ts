import { CreateReceiptDto } from '../dto/createReceipt.dto';
import { UpdateReceiptDto } from '../dto/updateReceipt.dto';
import { Receipt } from '../entities/receipt.entity';

/*
  월별 집계 결과 타입
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
  카테고리별 집계 결과 타입
  - 카테고리 없는(null) 영수증도 포함됨
*/
export interface CategorySummary {
  spendCategoryId: number | null;
  categoryName: string | null;
  icon: string | null;
  totalSpend: number;
  receiptCount: number;
}

export interface ReceiptRepository {
  createReceipt(dto: CreateReceiptDto): Promise<Receipt>;
  findByReceiptId(receiptId: string): Promise<Receipt | null>;
  findByUserId(userId: string): Promise<Receipt[]>;
  updateReceipt(
    receiptId: string,
    dto: UpdateReceiptDto,
  ): Promise<Receipt | null>;
  softDeleteReceipt(receiptId: string): Promise<boolean>;

  getMonthlyTotals(userId: string, year: number): Promise<MonthlyTotal[]>;
  getCategorySummary(
    userId: string,
    year: number,
    month?: number,
  ): Promise<CategorySummary[]>;
}