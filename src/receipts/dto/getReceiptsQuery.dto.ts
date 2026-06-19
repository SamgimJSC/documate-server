import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

/*
  정렬 옵션
  - 사용자가 ?sort= 쿼리로 보낼 수 있는 값 4가지
  - 이외의 값이 오면 @IsEnum() 데코레이터가 자동으로 400 에러 반환
*/
export enum ReceiptSortType {
  LATEST = 'latest', // 등록일(createdAt) 내림차순
  PURCHASE_DATE = 'purchaseDate', // 구매일 내림차순
  AMOUNT_DESC = 'amountDesc', // 금액 큰 순
  AMOUNT_ASC = 'amountAsc', // 금액 작은 순
}

/*
  GET /receipts 의 쿼리 파라미터 DTO

  지원 파라미터:
  - 날짜 필터: year, month, date 또는 fromDate~toDate
  - 카테고리: categoryId
  - 키워드 검색: keyword (가맹점/품목/메모를 OR로 검색)
  - 정렬: sort (위 enum 중 하나)
  - 페이지네이션: page, size

  모든 파라미터는 선택적. 아무것도 안 보내면 "내 모든 영수증을 최신순 1페이지" 반환.
*/
export class GetReceiptsQueryDto {
  // ===== 날짜 필터 =====
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  // ===== 카테고리 필터 =====
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  categoryId?: number;

  // ===== 키워드 검색 =====
  @IsOptional()
  @IsString()
  keyword?: string;

  // ===== 정렬 =====
  @IsOptional()
  @IsEnum(ReceiptSortType)
  sort?: ReceiptSortType;

  // ===== 페이지네이션 =====
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;
}