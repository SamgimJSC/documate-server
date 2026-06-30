import {
  IsDefined,
  IsNotEmpty,
  IsNumberString,
  Length,
} from 'class-validator';

export class UpdatePinDto {
  @IsNumberString()
  @IsNotEmpty()
  @IsDefined()
  @Length(6, 6)
  currentPin: string;

  @IsNumberString()
  @IsNotEmpty()
  @IsDefined()
  @Length(6, 6)
  newPin: string;
}
