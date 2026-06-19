import {
  IsDefined,
  IsNotEmpty,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { rPassword } from '../../global/reg';

/*
  비밀번호 재설정 요청 DTO

  흐름:
  1) /auth/email-verification/send (purpose=RESET_PW)로 코드 발송
  2) /auth/email-verification/verify로 코드 검증
  3) 이 DTO로 새 비밀번호 등록

  emailVerificationId가 본인 확인 토큰 역할.
*/
export class ResetPasswordDto {
  @IsUUID()
  @IsNotEmpty()
  @IsDefined()
  emailVerificationId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(rPassword, {
    message:
      'password must contain at least one letter and one number and be 8-20 characters long',
  })
  newPassword: string;
}