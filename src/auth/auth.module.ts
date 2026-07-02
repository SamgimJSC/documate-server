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
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard, NodeMailer],
})
export class AuthModule {}
