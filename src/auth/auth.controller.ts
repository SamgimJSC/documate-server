import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signUp.dto';
import { SendEmailVerificationDto } from './dto/sendEmailVerification.dto';
import { VerifyEmailVerificationDto } from './dto/verifyEmailVerification.dto';
import { LoginDto } from './dto/login.dto';
import { type Response, type Request } from 'express';
import { JwtAuthGuard } from './auth.guard';
import { ReqUser } from '../global/types/express';
import { DecoUser } from '../global/decorators/decoUser.decorator';
import { User } from '../users/entities/user.entity';
import { ResetPasswordDto } from './dto/resetPassword.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() body: SignUpDto) {
    return this.authService.signUp(body);
  }

  @Post('email-verification/send')
  async sendEmailVerification(@Body() body: SendEmailVerificationDto) {
    return this.authService.sendEmailVerification(body);
  }

  @Post('email-verification/verify')
  async verifyEmailVerification(@Body() body: VerifyEmailVerificationDto) {
    return this.authService.verifyEmailVerification(body);
  }

  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.login(body);
    res.cookie('X-Access-Token', accessToken, {
      httpOnly: true,
      secure: false, // production 에서는 true로 하기
      sameSite: 'lax',
    });
    return null;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('X-Access-Token', { httpOnly: true, sameSite: 'lax' });
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }
}