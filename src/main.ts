import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TypedConfigService } from './configs/typedConfig.service';
import { initializeTransactionalContext } from 'typeorm-transactional';
import { LoggerInterceptor } from './global/interceptors/logger.interceptor';
import { GlobalExceptionFilter } from './global/filters/globalException.filter';
import { ResponseInterceptor } from './global/interceptors/response.interceptor';

async function bootstrap() {
  initializeTransactionalContext(); // 트랜잭션 컨텍스트 초기화

  const app = await NestFactory.create(AppModule);

  const configService = app.get(TypedConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 명시하지 않은 프로퍼티는 제거
      forbidNonWhitelisted: true, // 명시하지 않은 프로퍼티가 있을 경우 에러 발생. whitelist: true와 같이 사용!
      transform: true, // 유저가 보낸 데이터(param, query, body 모두)를 실제 DTO클래스 인스턴스 혹은 실제 지정한 타입으로 변환.
    }),
  );

  app.useGlobalInterceptors(
    new LoggerInterceptor(),
    // app.get(ServiceLogInterceptor),
    // app.get(TokenRefreshInterceptor),
    new ResponseInterceptor(),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(configService.get('PORT'));

  console.log(`서버가 ${configService.get('PORT')}번포트로 열렸습니다.`);
}

bootstrap();
