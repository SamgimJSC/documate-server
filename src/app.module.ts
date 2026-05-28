import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
// import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { validate } from './configs/env.validaion';
import { TypedConfigService } from './configs/typedConfig.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      validate,
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}.local`,
        `.env.${process.env.NODE_ENV || 'development'}`,
      ],
    }),

    // TypeOrmModule.forRootAsync({
    //   inject: [TypedConfigService],
    //   useFactory: (config: TypedConfigService) => ({
    //     type: 'postgres',
    //     host: config.get('DB_HOST'),
    //     port: config.get('DB_PORT'),
    //     username: config.get('DB_USER'),
    //     password: config.get('DB_PASSWORD'),
    //     database: config.get('DB_NAME'),
    //     entities: [User, Report],
    //     synchronize: config.get('DB_SYNCHRONIZE'),
    //     autoLoadEntities: true,
    //   }),
    //   dataSourceFactory: async (options) => {
    //     const dataSource = new DataSource(options);
    //     await dataSource.initialize();
    //     return addTransactionalDataSource(dataSource);
    //   },
    // }),
    // ,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService, TypedConfigService],
})
export class AppModule {}
