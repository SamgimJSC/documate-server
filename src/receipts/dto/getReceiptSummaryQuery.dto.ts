import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetReceiptSummaryQueryDto {
  @IsOptional()
  @Type(() => Number) //쿼리스트링이 문자열로 오기 때문에 숫자로 자동 변환해주는 데코레이터
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
}