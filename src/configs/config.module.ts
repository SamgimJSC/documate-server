import { Global, Module } from '@nestjs/common';
import { TypedConfigService } from './typedConfig.service';

@Global()
@Module({
  providers: [TypedConfigService],
  exports: [TypedConfigService],
})
export class ConfigModule {}
