import { Inject, Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/signUp.dto';
import { type EmailVerificationRepository } from './model/email-verification.interface';
import { EConflictException } from '../global/exceptions/EConflictException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import * as bcrypt from 'bcrypt';
import { TypeOrmEmailVerificationRepository } from './model/email-verification.repository';
import { SendEmailVerificationDto } from './dto/sendEmailVerification.dto';
import crypto from 'crypto';
import { NodeMailer } from './providors/nodeMailer';
import { EServiceUnavailableException } from '../global/exceptions/EServiceUnavailableException';
import { VerifyEmailVerificationDto } from './dto/verifyEmailVerification.dto';
import { LoginDto } from './dto/login.dto';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { EUnauthorizedException } from '../global/exceptions/EUnauthorizedException';
import { JwtPayload } from './types/jwtPayload.type';
import { JwtService } from '@nestjs/jwt';
import { TypedConfigService } from '../configs/typedConfig.service';
import { type AuthTokenRepository } from './model/auth-token.interface';
import { TypeOrmAuthTokenRepository } from './model/auth-token.repository';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { VerificationPurpose } from '../global/constants/verificationPurpose.enum';

@Injectable()
export class AuthService {
  constructor(
    @Inject(TypeOrmEmailVerificationRepository)
    private readonly emailVerificationRepository: EmailVerificationRepository,
    @Inject(TypeOrmAuthTokenRepository)
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly usersService: UsersService,
    private readonly nodeMailer: NodeMailer,
    private readonly jwtService: JwtService,
    private readonly configService: TypedConfigService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, nickname, password, emailVerificationId, pinNumber } =
      signUpDto;

    const emailVerification =
      await this.emailVerificationRepository.findByVerificationId(
        emailVerificationId,
      );

    if (!emailVerification || emailVerification.isUsed) {
      throw new EConflictException({
        message: '이메일 인증이 유효하지 않습니다.',
        errorCode: ERROR_CODE.INVALID_EMAIL_VERIFICATION,
      });
    }

    const hashedPw = await bcrypt.hash(password, 10);

    const hashedPin = await bcrypt.hash(pinNumber, 10);

    const createdUser = await this.usersService.createUser(
      { email, nickname, password: hashedPw },
      hashedPin,
    );

    await this.emailVerificationRepository.markAsUsed(emailVerificationId);

    return createdUser;
  }

  /*
    이메일 인증 코드 발송
    - purpose=SIGNUP: 이미 가입된 이메일이면 에러 (중복 방지)
    - purpose=RESET_PW: 가입 안 된 이메일이면 에러 (없는 계정 재설정 불가)
  */
  async sendEmailVerification(
    sendEmailVerificationDto: SendEmailVerificationDto,
  ) {
    const { email, purpose } = sendEmailVerificationDto;

    const foundUsers = await this.usersService.getUsers({ email });

    // 회원가입: 이미 존재하면 거부
    if (purpose === VerificationPurpose.SIGNUP && foundUsers.length) {
      throw new EConflictException({
        message: '이미 존재하는 이메일 입니다.',
        errorCode: ERROR_CODE.EMAIL_ALREADY_USED,
      });
    }

    // 비밀번호 재설정: 존재해야 함
    if (purpose === VerificationPurpose.RESET_PW && !foundUsers.length) {
      throw new ENotFoundException({
        message: '등록되지 않은 이메일입니다.',
        errorCode: ERROR_CODE.EMAIL_NOT_REGISTERED,
      });
    }

    try {
      const code = this.createVerificationCode();

      const emailVerification =
        await this.emailVerificationRepository.createVerification({
          email,
          code,
          purpose,
          expiresAt: this.getExpiresAt(),
        });

      // 메일 제목은 목적에 따라 분기
      const subject =
        purpose === VerificationPurpose.RESET_PW
          ? '[Documate] 비밀번호 재설정 이메일 인증'
          : '[Documate] 회원가입 이메일 인증';

      await this.nodeMailer.sendEmail({
        to: email,
        subject,
        code,
      });

      return { emailVerificationId: emailVerification.verificationId };
    } catch (err) {
      console.error(err);

      throw new EServiceUnavailableException({
        message: '이메일 전송에 실패했습니다.',
        errorCode: ERROR_CODE.EMAIL_SEND_FAILURE,
      });
    }
  }

  async verifyEmailVerification(
    verifyEmailVerificationDto: VerifyEmailVerificationDto,
  ) {
    const { emailVerificationId, codeNumber } = verifyEmailVerificationDto;

    const verification =
      await this.emailVerificationRepository.findByVerificationId(
        emailVerificationId,
      );

    if (
      !verification ||
      verification.isUsed ||
      this.isExpired(verification.expiresAt) ||
      verification.code !== codeNumber
    ) {
      throw new EConflictException({
        message: '이메일 인증이 유효하지 않습니다.',
        errorCode: ERROR_CODE.INVALID_EMAIL_VERIFICATION,
      });
    }

    return true;
  }

  /*
    비밀번호 재설정
    - 흐름:
      1) emailVerification이 유효한지 검증 (UUID, 미사용, 미만료, RESET_PW 목적)
      2) 해당 이메일로 가입된 사용자 찾기
      3) 새 비밀번호 해시 후 업데이트
      4) emailVerification을 markAsUsed → 일회성 토큰
    - 보안 포인트: emailVerification.email로 사용자를 찾기 때문에
      클라이언트가 다른 사람 이메일을 보낼 수 없음 (인증된 이메일로만 변경 가능)
  */
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { emailVerificationId, newPassword } = resetPasswordDto;

    // 1) 인증 토큰 유효성 검증
    const verification =
      await this.emailVerificationRepository.findByVerificationId(
        emailVerificationId,
      );

    if (
      !verification ||
      verification.isUsed ||
      this.isExpired(verification.expiresAt) ||
      verification.purpose !== VerificationPurpose.RESET_PW
    ) {
      throw new EConflictException({
        message: '이메일 인증이 유효하지 않습니다.',
        errorCode: ERROR_CODE.INVALID_EMAIL_VERIFICATION,
      });
    }

    // 2) 인증된 이메일로 사용자 찾기
    const [user] = await this.usersService.getUsers({
      email: verification.email,
    });

    if (!user) {
      throw new ENotFoundException({
        message: '존재하지 않는 계정입니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });
    }

    // 3) 새 비밀번호 해싱 후 업데이트
    const hashedPw = await bcrypt.hash(newPassword, 10);
    await this.usersService.updateUser(user.userId, { password: hashedPw });

    // 4) 일회용 인증 토큰 사용 처리 (재사용 방지)
    await this.emailVerificationRepository.markAsUsed(emailVerificationId);

    // 5) 보안: 기존 로그인 세션 모두 무효화 (재로그인 강제)
    await this.authTokenRepository.deleteByUserId(user.userId);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const [dbUser] = await this.usersService.getUsers({ email });

    if (!dbUser)
      throw new ENotFoundException({
        message: '존재하지 않는 계정입니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });

    const dbPw = dbUser.password;

    const isValid = await bcrypt.compare(password, dbPw);

    if (!isValid)
      throw new EUnauthorizedException({
        message: '비밀번호가 일치하지 않습니다.',
        errorCode: ERROR_CODE.INVALID_PASSWORD,
      });

    const { accessToken, refreshToken } = this.signTokens(dbUser.userId);

    await this.authTokenRepository.deleteByUserId(dbUser.userId);
    await this.authTokenRepository.createToken({
      userId: dbUser.userId,
      accessToken,
      refreshToken,
    });

    return { accessToken };
  }

  async logout(userId: string): Promise<void> {
    await this.authTokenRepository.deleteByUserId(userId);
  }

  createVerificationCode() {
    return crypto.randomInt(100000, 1000000).toString();
  }

  getExpiresAt(minutes = 5): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  isExpired(expiresAt: Date): boolean {
    return expiresAt.getTime() <= Date.now();
  }

  signTokens(userId: string) {
    const payload: JwtPayload = { sub: userId };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    return { accessToken, refreshToken };
  }

  async tryRefresh(userId: string): Promise<string> {
    const [tokenRecord] = await this.authTokenRepository.findByUserId(userId);

    if (!tokenRecord) {
      throw new EUnauthorizedException({
        errorCode: ERROR_CODE.INVALID_TOKEN,
        message: '유효하지 않은 토큰입니다.',
      });
    }

    const refreshPayload = this.jwtService.decode(tokenRecord.refreshToken);

    if (!refreshPayload?.exp || Date.now() >= refreshPayload.exp * 1000) {
      throw new EUnauthorizedException({
        errorCode: ERROR_CODE.INVALID_TOKEN,
        message: '유효하지 않은 토큰입니다.',
      });
    }

    const payload: JwtPayload = { sub: userId };
    const newAccessToken = this.jwtService.sign(payload);

    await this.authTokenRepository.updateToken(tokenRecord.tokenId, {
      accessToken: newAccessToken,
    });

    return newAccessToken;
  }

  verifyToken(token: string) {
    try {
      this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch (err) {
      console.error(err);

      throw new EUnauthorizedException({
        message: '유효한 토큰이 아닙니다.',
        errorCode: ERROR_CODE.INVALID_TOKEN,
      });
    }
  }
}