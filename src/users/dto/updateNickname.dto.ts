import { IsOptional } from 'class-validator';

export class UpdateNicknameDto {
  @IsOptional()
  nickname?: string;
}
