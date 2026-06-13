import { IsEnum } from 'class-validator';
import { UploadTarget } from '../../global/constants/uploadTarget.enum';

export class UploadFileDto {
  @IsEnum(UploadTarget)
  targetType: UploadTarget;
}
