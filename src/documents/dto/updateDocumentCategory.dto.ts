import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDocumentCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  defaultNotifyOffsetDays?: number | null;

  @IsOptional()
  @IsBoolean()
  isSecured?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string | null;
}
