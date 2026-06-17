import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { validate } from './configs/env.validaion';
import { TypedConfigService } from './configs/typedConfig.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { TypedConfigModule } from './configs/config.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { UploadsModule } from './uploads/uploads.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from './redis/redis.module';
import { ReportsModule } from './reports/reports.module';

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
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [TypedConfigModule],
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService) => ({
        // host: config.get('DB_HOST'),
        // port: config.get('DB_PORT'),
        // username: config.get('DB_USER'),
        // password: config.get('DB_PASSWORD'),
        type: 'postgres',
        url: config.get('DB_URL'),
        ssl: { rejectUnauthorized: false },
        database: config.get('DB_NAME'),
        synchronize: config.get('DB_SYNCHRONIZE'),
        autoLoadEntities: true,
      }),
      dataSourceFactory: async (options) => {
        const dataSource = new DataSource(options!);
        await dataSource.initialize();
        return addTransactionalDataSource(dataSource);
      },
    }),

    UsersModule,

    AuthModule,

    DocumentsModule,

    NotificationsModule,

    ReceiptsModule,

    ReportsModule,

    SubscriptionsModule,

    PaymentsModule,

    AdminModule,

    UploadsModule,

    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService, TypedConfigService],
})
export class AppModule {}
