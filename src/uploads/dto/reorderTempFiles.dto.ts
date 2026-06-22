import { Type } from 'class-transformer';
import {
  IsArray,
  IsUUID,
  ValidateNested,
  ArrayNotEmpty,
  IsNumber,
  IsNotEmpty,
  IsDefined,
  Min,
} from 'class-validator';

export class TempFileOrderItem {
  @IsUUID()
  @IsNotEmpty()
  @IsDefined()
  id: string;

  @IsNumber()
  @IsNotEmpty()
  @IsDefined()
  @Min(1)
  pageNo: number;
}

export class ReorderTempFilesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TempFileOrderItem)
  files: TempFileOrderItem[];
}
