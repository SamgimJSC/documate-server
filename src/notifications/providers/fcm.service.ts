import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { TypedConfigService } from '../../configs/typedConfig.service';

/*
  FCM(Firebase Cloud Messaging) 발송 전용 서비스

  - 서버 시작 시 1번만 firebase-admin SDK 초기화
  - send(): 단일 디바이스 토큰에 푸시 발송
  - sendMulti(): 한 사용자의 여러 기기에 한 번에 발송
*/
@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);

  constructor(private readonly configService: TypedConfigService) {}

  /*
    NestJS 라이프사이클 훅 — 모듈이 초기화될 때 자동 호출됨.
    여기서 firebase-admin SDK를 한 번만 초기화한다.
  */
  onModuleInit() {
    // 이미 초기화돼 있으면 스킵 (테스트 환경 등에서 중복 호출 방지)
    if (getApps().length > 0) return;

    const serviceAccountPath = this.configService.get(
      'FCM_SERVICE_ACCOUNT_PATH',
    );

    try {
      initializeApp({
        credential: cert(serviceAccountPath),
      });
      this.logger.log('Firebase Admin SDK 초기화 완료');
    } catch (err) {
      this.logger.warn(
        `Firebase Admin SDK 초기화 실패 — FCM 기능이 비활성화됩니다. (${err instanceof Error ? err.message : String(err)})`,
      );
    }
  }

  /*
    단일 디바이스 토큰으로 푸시 발송

    파라미터:
    - token: 받을 디바이스의 FCM 토큰
    - title: 알림 제목 (폰 화면에 굵게 표시)
    - body:  알림 본문
    - data:  앱이 받았을 때 분기 처리할 메타데이터 (문자열만 가능)
             예: { documentId: "...", category: "DOC" }
  */
  async send(params: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<void> {
    const { token, title, body, data } = params;

    try {
      const messageId = await getMessaging().send({
        token,
        notification: { title, body },
        data,
      });

      this.logger.log(`FCM 발송 성공 messageId=${messageId}`);
    } catch (err) {
      this.logger.error(
        `FCM 발송 실패 token=${token.slice(0, 10)}...`,
        err instanceof Error ? err.message : String(err),
      );
      throw err;
    }
  }

  /*
    여러 디바이스 토큰에 한 번에 발송 (멀티캐스트)
    한 사용자가 폰 + 태블릿 + 웹 등 여러 기기 가진 경우에 사용.

    반환값:
    - successCount: 성공한 개수
    - failureCount: 실패한 개수 (만료된 토큰 등)
  */
  async sendMulti(params: {
    tokens: string[];
    title: string;
    body: string;
    data?: Record<string, string>;
  }): Promise<{ successCount: number; failureCount: number }> {
    const { tokens, title, body, data } = params;

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data,
    });

    this.logger.log(
      `FCM 멀티캐스트 발송 — 성공 ${response.successCount}/${tokens.length}`,
    );

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  }
}
