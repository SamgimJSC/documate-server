import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signUp.dto';
import { SendEmailVerificationDto } from './dto/sendEmailVerification.dto';
import { VerifyEmailVerificationDto } from './dto/verifyEmailVerification.dto';
import { LoginDto } from './dto/login.dto';
import { type Response } from 'express';
import { JwtAuthGuard } from './auth.guard';
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
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    return null;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Res({ passthrough: true }) res: Response,
    @Body('deviceToken') deviceToken?: string,
  ) {
    res.clearCookie('X-Access-Token', { httpOnly: true, sameSite: 'lax' });
    if (deviceToken) {
      await this.authService.deactivateDeviceTokenByFcmString(deviceToken).catch(() => {});
    }
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

}