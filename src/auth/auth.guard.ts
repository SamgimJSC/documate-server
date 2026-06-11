import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EUnauthorizedException } from '../global/exceptions/EUnauthorizedException';
import { ERROR_CODE } from '../global/constants/errorCode.const';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor() {
    super();
  }

  handleRequest(err, user, info, context: ExecutionContext) {
    if (err || !user) {
      throw (
        err ||
        new EUnauthorizedException({
          errorCode: ERROR_CODE.INVALID_TOKEN,
          message: '유효하지 않은 토큰입니다.',
        })
      );
    }

    return user;
  }
}
