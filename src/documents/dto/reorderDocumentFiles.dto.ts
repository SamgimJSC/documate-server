import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';

class FileOrderItem {
  @IsInt()
  fileId: number;

  @IsInt()
  @Min(1)
  @Max(10)
  pageNo: number;
}

export class ReorderDocumentFilesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FileOrderItem)
  files: FileOrderItem[];
}
