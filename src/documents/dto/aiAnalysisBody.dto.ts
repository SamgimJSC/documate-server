import { IsDefined, IsNotEmpty, IsUUID } from 'class-validator';

export class AiAnalysisBodyDto {
  @IsUUID()
  @IsNotEmpty()
  @IsDefined()
  documentId: string;
}
