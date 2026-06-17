import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { NotificationCategory } from '../../global/constants/notificationCategory.enum';

/*
  알림 생성 요청 바디 (외부 입력용)

   userId 없음!
  → 클라이언트가 userId를 보낼 수 있으면 "남의 알림 만들기"가 가능해져 보안 구멍이 됨
  → 컨트롤러가 토큰에서 꺼내 채워줍니다
*/
export class CreateNotificationBodyDto {
  @IsOptional()
  @IsUUID()
  documentId?: string;

  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200) // DB 스키마: VARCHAR(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(300) // DB 스키마: VARCHAR(300)
  body?: string;
}
