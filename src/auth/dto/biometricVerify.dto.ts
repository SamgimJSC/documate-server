import { IsDefined, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class BiometricVerifyDto {
  @IsUUID()
  @IsNotEmpty()
  @IsDefined()
  challenge_id: string;

  @IsString()
  @IsNotEmpty()
  @IsDefined()
  signature: string;
}
