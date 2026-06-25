export type EnvConfigType = {
  BASE_URL: string;
  HOST: string;
  PORT: number;
  JWT_SECRET: string;
  EMAIL: string;

  // DB_HOST: string;
  // DB_PORT: number;
  // DB_USER: string;
  // DB_PASSWORD: string;
  DB_URL: string;
  DB_NAME: string;
  DB_SYNCHRONIZE: boolean;
  FCM_SERVICE_ACCOUNT_PATH: string;

  NODE_MAILER_USER: string;
  NODE_MAILER_PASS: string;
  WEB_URL: string;

  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;

  // AWS S3 설정 — 파일 업로드 기능 사용 시 .env에 반드시 추가 필요 (.env.example 참고)
  AWS_REGION: string;
  AWS_S3_BUCKET_NAME: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_CLOUDFRONT_URL?: string; // 선택값 — 있으면 fileUrl을 CloudFront 기준으로 생성
};
