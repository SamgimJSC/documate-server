import { ConsentType } from '../../global/constants/consentType.enum';
import { CreateUserConsentDto } from '../dto/createUserConsent.dto';
import { UpdateUserConsentDto } from '../dto/updateUserConsent.dto';
import { UserConsent } from '../entities/user-consent.entity';

export interface UserConsentRepository {
  createConsent(dto: CreateUserConsentDto): Promise<UserConsent>;
  findByUserId(userId: string): Promise<UserConsent[]>;
  findByUserIdAndType(
    userId: string,
    consentType: ConsentType,
  ): Promise<UserConsent | null>;
  updateConsent(
    userId: string,
    consentType: ConsentType,
    dto: UpdateUserConsentDto,
  ): Promise<UserConsent | null>;
  bulkUpsert(
    userId: string,
    dtos: CreateUserConsentDto[],
  ): Promise<UserConsent[]>;
}
