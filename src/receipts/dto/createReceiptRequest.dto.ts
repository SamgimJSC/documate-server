import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InputMethod } from '../../global/constants/inputMethod.enum';

export class CreateReceiptRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  spendCategoryId?: number | null;

  @IsEnum(InputMethod)
  inputMethod: InputMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string | null;

  @IsString()
  @MaxLength(100)
  storeName: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  storeAddress?: string | null;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsDateString()
  purchaseDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  paymentItem?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  memo?: string | null;

  @IsOptional()
  @IsString()
  ocrText?: string | null;

  @IsOptional()
  @IsObject()
  extractedData?: Record<string, any> | null;

  @IsOptional()
  @IsBoolean()
  isConfirmed?: boolean;
}
