import { IsBoolean } from 'class-validator';

export class UpdateUserConsentRequestDto {
  @IsBoolean()
  isAgreed: boolean;
}
