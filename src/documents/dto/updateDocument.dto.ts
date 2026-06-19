import {
  IsString,
  IsOptional,
  IsInt,
  IsNumber,
  IsDateString,
  IsObject,
  IsBoolean,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDocumentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  ocrText?: string | null;

  @IsOptional()
  @IsObject()
  extractedData?: Record<string, any> | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  aiConfidence?: number | null;

  @IsOptional()
  @IsDateString()
  issueDate?: string | null;

  @IsOptional()
  @IsDateString()
  expiryDate?: string | null;

  @IsOptional()
  @IsDateString()
  renewalDate?: string | null;

  @IsOptional()
  @IsBoolean()
  isConfirmed?: boolean;
}
