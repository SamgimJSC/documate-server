import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './types/jwtPayload.type';
import { Request } from 'express';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
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

    return { ...user, isExpired };
  }
}
