import { ConsentType } from '../../global/constants/consentType.enum';

export const DEFAULT_USER_CONSENTS: Array<{
  consentType: ConsentType;
  isRequired: boolean;
}> = [
  { consentType: ConsentType.TERMS, isRequired: true },
  { consentType: ConsentType.PRIVACY, isRequired: true },
  { consentType: ConsentType.MARKETING, isRequired: false },
  { consentType: ConsentType.THIRD_PARTY, isRequired: false },
];
