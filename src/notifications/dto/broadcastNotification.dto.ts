import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/*
  전체공지 발송 요청 바디 (토픽 브로드캐스트 실험용)
  - 개인 알림함(notifications 테이블)에는 기록되지 않고 푸시만 발송됨
*/
export class BroadcastNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  body?: string;
}
