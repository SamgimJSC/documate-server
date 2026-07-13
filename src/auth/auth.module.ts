import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { TypedConfigService } from '../configs/typedConfig.service';
import { TypeOrmAuthTokenRepository } from './model/auth-token.repository';
import { TypeOrmEmailVerificationRepository } from './model/email-verification.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerification } from './entities/email-verification.entity';
import { AuthToken } from './entities/auth-token.entity';
import { NodeMailer } from './providors/nodeMailer';
import { DeviceToken } from '../notifications/entities/device-token.entity';
import { BiometricChallenge } from './entities/biometric-challenge.entity';
import { TypeOrmBiometricChallengeRepository } from './model/biometric-challenge.repository';
import { FcmService } from '../notifications/providers/fcm.service';

/*
  FcmService는 NotificationsModule에서도 provide 되지만,
  NotificationsModule → AuthModule을 import하고 있어 순환 참조를 피하려고
  여기서 별도로 provide한다. (stateless, firebase-admin SDK는 전역 싱글톤이라 중복 provide해도 안전)
*/
@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerification, AuthToken, DeviceToken, BiometricChallenge]),
    JwtModule.registerAsync({
      inject: [TypedConfigService],
      useFactory: (config: TypedConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    NodeMailer,
    JwtStrategy,
    JwtAuthGuard,
    TypeOrmEmailVerificationRepository,
    TypeOrmAuthTokenRepository,
    TypeOrmBiometricChallengeRepository,
    FcmService,
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard, NodeMailer],
})
export class AuthModule {}
