import { IsOptional } from 'class-validator';

export class VerifyPasswordDto {
  @IsOptional()
  password?: string;
}
