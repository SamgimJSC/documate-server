import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsDateString,
  IsObject,
  IsArray,
  IsUrl,
  ValidateNested,
  ArrayNotEmpty,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FileType } from '../../global/constants/fileType.enum';
import { InputMethod } from '../../global/constants/inputMethod.enum';

export class DocumentFileDto {
  @IsUrl()
  fileUrl: string;

  @IsInt()
  @Min(1)
  pageNo: number;
}

export class CreateDocumentDto {
  @IsEnum(InputMethod)
  inputMethod: InputMethod;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType | null;

  @IsOptional()
  @IsString()
  fileSizeBytes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageCount?: number | null;

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
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DocumentFileDto)
  files?: DocumentFileDto[];
}
