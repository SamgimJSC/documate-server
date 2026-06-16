import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadDocumentFileDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  pageNo: number;
}
