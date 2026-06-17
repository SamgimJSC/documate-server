import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { DOCUMENT_TAG_NAME_MAX_LENGTH } from '../../global/constants/document-limit.const';

export class AddDocumentTagDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(DOCUMENT_TAG_NAME_MAX_LENGTH)
  name: string;
}
