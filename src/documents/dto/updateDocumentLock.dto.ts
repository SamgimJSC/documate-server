import { IsBoolean, IsDefined, IsNotEmpty, IsNumberString, Length } from 'class-validator';

export class UpdateDocumentLockDto {
  @IsBoolean()
  isLocked: boolean;

  @IsNumberString()
  @IsNotEmpty()
  @IsDefined()
  @Length(6, 6)
  pinNumber: string;
}
