// config/typed-config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfigType } from './configuration.type';

@Injectable()
export class TypedConfigService {
  constructor(private readonly configService: ConfigService<EnvConfigType>) {}

  get<K extends keyof EnvConfigType>(key: K): EnvConfigType[K] {
    return this.configService.get(key, { infer: true })!;
  }
}
