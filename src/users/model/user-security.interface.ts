import { UserSecurity } from '../entities/user-security.entity';
import { CreateUserSecurityDto } from '../dto/createUserSecurity.dto';
import { UpdateUserSecurityDto } from '../dto/updateUserSecurity.dto';

export interface UserSecurityRepository {
  createSecurity(dto: CreateUserSecurityDto): Promise<UserSecurity>;
  findByUserId(userId: string): Promise<UserSecurity | null>;
  findBySecurityId(securityId: string): Promise<UserSecurity | null>;
  updateSecurity(
    userId: string,
    dto: UpdateUserSecurityDto,
  ): Promise<UserSecurity | null>;
  incrementPinFailedCount(userId: string): Promise<boolean>;
  resetPinFailedCount(userId: string): Promise<boolean>;
}
