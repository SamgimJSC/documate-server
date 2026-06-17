import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

/*
  /reports/* API의 쿼리 파라미터 DTO

  세 가지 엔드포인트 모두 이 DTO 하나로 처리:
  - /reports/monthly-spend?year=2026
  - /reports/daily-spend?year=2026&month=6
  - /reports/category-summary?year=2026&month=6  또는  ?date=2026-06-09

  각 엔드포인트마다 필요한 파라미터는 다르지만,
  DTO 하나에 다 모아두고 컨트롤러/서비스에서 필요한 것만 꺼내 씁니다.
*/
export class GetReportQueryDto {
  @IsOptional()
  @Type(() => Number) // 쿼리스트링은 항상 문자열로 옴 → 숫자로 변환
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
  @IsDateString() // "YYYY-MM-DD" 형식 검증
  date?: string;
}