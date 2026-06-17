import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { FileType } from '../../global/constants/fileType.enum';
import { AiStatus } from '../../global/constants/aiStatus.enum';
import {
  DOCUMENT_DEFAULT_PAGE,
  DOCUMENT_DEFAULT_LIMIT,
} from '../../global/constants/document-limit.const';

export class GetDocumentsQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsEnum(FileType)
  fileType?: FileType;

  @IsOptional()
  @IsEnum(AiStatus)
  aiStatus?: AiStatus;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isFavorite?: boolean;

  @IsOptional()
  @IsUUID()
  tagId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DOCUMENT_DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = DOCUMENT_DEFAULT_LIMIT;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'title', 'expiryDate'])
  sort?: string = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
