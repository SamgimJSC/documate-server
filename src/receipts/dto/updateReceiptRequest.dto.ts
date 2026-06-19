import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/*
  영수증 수정 요청 바디 (외부 입력용)

  사용자가 PATCH /receipts/:id 로 보낼 수 있는 필드만 정의.
  - 시스템 관리 필드(ocrText, extractedData, aiStatus, inputMethod, fileUrl 등)는 제외
  - 모든 필드 optional → 일부 필드만 보내도 OK (PATCH의 본질)

  내부용 UpdateReceiptDto는 모든 필드를 받지만,
  이 외부용 DTO는 사용자가 변경할 수 있는 필드만 검증해서 받는다.
*/
export class UpdateReceiptRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(100) // DB 스키마: VARCHAR(100)
  storeName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300) // DB 스키마: VARCHAR(300)
  storeAddress?: string | null;

  @IsOptional()
  @Type(() => Number) // JSON으로 와도 안전하게 숫자로 변환
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsDateString() // "YYYY-MM-DD" 형식 검증
  purchaseDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  spendCategoryId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200) // DB 스키마: VARCHAR(200)
  paymentItem?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300) // DB 스키마: VARCHAR(300)
  memo?: string | null;

  @IsOptional()
  @IsBoolean()
  isConfirmed?: boolean;
}