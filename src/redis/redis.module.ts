import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
import { TypedConfigService } from '../configs/typedConfig.service';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: TypedConfigService) =>
        new Redis({
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD'),
        }),
      inject: [TypedConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
