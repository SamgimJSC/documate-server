import { IsDefined, IsNotEmpty, IsNumberString, Length } from 'class-validator';

export class UnlockDocumentDto {
  @IsNumberString()
  @IsNotEmpty()
  @IsDefined()
  @Length(6, 6)
  pinNumber: string;
}
