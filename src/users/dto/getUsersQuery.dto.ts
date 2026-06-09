import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../../global/constants/userRole.enum';
import { UserPlan } from '../../global/constants/userPlan.enum';

export class GetUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nickname?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserPlan)
  plan?: UserPlan;
}
