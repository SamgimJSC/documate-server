import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signUp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() body: SignUpDto) {
    return this.authService.signUp(body);
  }

  //   @Post('login')
  //   async login(
  //     @Body() body: LoginDto,
  //     @Res({ passthrough: true }) res: Response,
  //   ) {
  //     const { accessToken } = await this.authService.login(body);

  //     res.cookie('X-Access-Token', accessToken, {
  //       httpOnly: true,
  //       secure: true,
  //       sameSite: 'lax',
  //     });

  //     // TODO: res양식 잡으면 수정
  //     return {};
  //   }

  //   @Post('email-verification')
  //   async emailVerification(@Body() body: EmailVerificationDto) {
  //     return this.authService.emailVerificationSignup(body);
  //   }
}
