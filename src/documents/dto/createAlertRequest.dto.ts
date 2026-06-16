import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AlertOffsetType } from '../../global/constants/alertOffsetType.enum';

export class CreateAlertRequestDto {
  @IsEnum(AlertOffsetType)
  offsetType: AlertOffsetType;

  @Type(() => Date)
  @IsDate()
  notifyDate: Date;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string | null;

  @IsOptional()
  @IsBoolean()
  channelEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  channelWebPush?: boolean;
}
