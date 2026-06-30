import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EUnauthorizedException } from '../global/exceptions/EUnauthorizedException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // passport 인증 실행 → request.user 세팅 (ignoreExpiration: true 이므로 만료 토큰도 통과)
    await super.canActivate(context);

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user.isExpired) {
      return true;
    }

    // access 토큰 만료 → refresh 토큰으로 재발급 시도
    const newAccessToken = await this.authService.tryRefresh(user.userId);

    const response = context.switchToHttp().getResponse();

    response.cookie('X-Access-Token', newAccessToken, {
      httpOnly: true,
      secure: false, // production 에서는 true로 하기
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    request.user = { ...user, isExpired: false };

    return true;
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw (
        err ||
        new EUnauthorizedException({
          errorCode: ERROR_CODE.INVALID_TOKEN,
          message: '유효하지 않은 토큰입니다.',
        })
      );
    }

    // isExpired 여부는 canActivate에서 판단
    return user;
  }
}
