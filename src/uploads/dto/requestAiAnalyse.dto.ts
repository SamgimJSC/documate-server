import { Type } from 'class-transformer';
import {
  IsArray,
  IsUUID,
  ValidateNested,
  ArrayNotEmpty,
  IsNumber,
  IsNotEmpty,
  IsDefined,
} from 'class-validator';

export class TempDocumentFileItem {
  @IsUUID()
  @IsNotEmpty()
  @IsDefined()
  id: string;

  @IsNumber()
  @IsNotEmpty()
  @IsDefined()
  pageNo: number;
}

export class RequestAiAnalyseDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TempDocumentFileItem)
  files: TempDocumentFileItem[];
}
