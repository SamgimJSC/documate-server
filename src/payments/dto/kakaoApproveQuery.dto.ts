import { IsOptional, IsString, IsUUID } from 'class-validator';

export class KakaoApproveQueryDto {
  @IsUUID()
  paymentId: string;

  @IsString()
  pg_token: string;
}

export class KakaoResultQueryDto {
  @IsUUID()
  paymentId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
