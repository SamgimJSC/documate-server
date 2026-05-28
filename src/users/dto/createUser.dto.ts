import { IsDefined, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @IsDefined()
  name: string;

  @IsNumber()
  @IsNotEmpty()
  @IsDefined()
  age: number;
}
