import { CreateReceiptDto } from '../dto/createReceipt.dto';
import { UpdateReceiptDto } from '../dto/updateReceipt.dto';
import { Receipt } from '../entities/receipt.entity';
import { ReceiptSortType } from '../dto/getReceiptsQuery.dto';

/*
  목록 조회용 필터 옵션
*/
export interface FindReceiptsFilter {
  userId: string;
  year?: number;
  month?: number;
  date?: string;
  fromDate?: string;
  toDate?: string;
  categoryId?: number;
  keyword?: string;
  sort?: ReceiptSortType;
  page: number;
  size: number;
}

/*
  목록 조회 결과
  - rows: 영수증 배열 (카테고리 정보 포함)
  - totalCount: 필터 조건에 맞는 전체 개수 (페이지네이션 계산용)
*/
export interface FindReceiptsResult {
  rows: Receipt[];
  totalCount: number;
}

export interface ReceiptRepository {
  createReceipt(dto: CreateReceiptDto): Promise<Receipt>;
  findByReceiptId(receiptId: string): Promise<Receipt | null>;
  findByUserId(userId: string): Promise<Receipt[]>;
  existsByUserId(userId: string): Promise<boolean>;
  updateReceipt(
    receiptId: string,
    dto: UpdateReceiptDto,
  ): Promise<Receipt | null>;
  findByReceiptIdWithCategory(receiptId: string): Promise<Receipt | null>;

  // 목록 조회 (검색/필터/정렬/페이지네이션)
  findList(filter: FindReceiptsFilter): Promise<FindReceiptsResult>;
}