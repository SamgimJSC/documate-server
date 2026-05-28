export type EnvConfigType = {
  BASE_URL: string;
  HOST: string;
  PORT: number;
  JWT_SECRET: string;
  EMAIL: string;

  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SYNCHRONIZE: boolean;

  NODE_MAILER_USER: string;
  NODE_MAILER_PASS: string;
};
