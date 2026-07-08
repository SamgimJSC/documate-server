import { IsOptional } from 'class-validator';

export class UpdatePasswordDto {
  @IsOptional()
  current_password?: string;

  @IsOptional()
  new_password?: string;
}
