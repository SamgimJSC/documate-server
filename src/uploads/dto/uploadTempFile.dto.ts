import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';

export class UploadTempFileDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  pageNo: number;
}
