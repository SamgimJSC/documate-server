import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './types/jwtPayload.type';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { type AuthTokenRepository } from './model/auth-token.interface';
import { TypeOrmAuthTokenRepository } from './model/auth-token.repository';
import { EUnauthorizedException } from '../global/exceptions/EUnauthorizedException';
import { ERROR_CODE } from '../global/constants/errorCode.const';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
    @Inject(TypeOrmAuthTokenRepository)
    private readonly authTokenRepository: AuthTokenRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['X-Access-Token'],
      ]),
      ignoreExpiration: true,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  /*
    jwt 토큰에 담긴 payload로 부터 user정보를 조회하여 user객체 반환
    반환시 이후 req객체에 user키로 반환된 객체 접근 가능

    @User() user: UserEntity -> controller에서 사용가능
  */
  async validate(payload: JwtPayload) {
    const { sub, exp } = payload;

    const isExpired = Date.now() >= exp! * 1000;

    // if (this.configService.get('NODE_ENV') === 'development') {
    //   return {
    //     userId: sub,
    //     email: 'test@example.com',
    //     nickname: 'test-user',
    //     realName: 'Test User',
    //     profileImgUrl: null,
    //     role: UserRole.MEMBER,
    //     plan: UserPlan.FREE,
    //     storageUsedBytes: '0',
    //     storageQuotaBytes: null,
    //     isEmailVerified: true,
    //     lastLoginAt: null,
    //     withdrawalReason: null,
    //     deletedAt: null,
    //     isDeleted: false,
    //     isExpired,
    //   };
    // }

    const user = await this.userService.getOneUser(sub);

    if (!isExpired) {
      const [tokenRecord] = await this.authTokenRepository.findByUserId(sub);
      if (!tokenRecord) {
        throw new EUnauthorizedException({
          errorCode: ERROR_CODE.INVALID_TOKEN,
          message: '유효하지 않은 토큰입니다.',
        });
      }
    }

    return { ...user, isExpired };
  }
}
