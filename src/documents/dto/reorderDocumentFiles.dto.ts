import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { DOCUMENT_MAX_PAGE_NO } from '../../global/constants/document-limit.const';

class FileOrderItem {
  @IsInt()
  fileId: number;

  @IsInt()
  @Min(1)
  @Max(DOCUMENT_MAX_PAGE_NO)
  pageNo: number;
}

export class ReorderDocumentFilesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FileOrderItem)
  files: FileOrderItem[];
}
