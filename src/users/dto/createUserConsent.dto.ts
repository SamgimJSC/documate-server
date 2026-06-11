import { ConsentType } from '../../global/constants/consentType.enum';

export class CreateUserConsentDto {
  userId: string;
  consentType: ConsentType;
  isRequired: boolean;
  isAgreed: boolean;
  agreedAt?: Date | null;
}
