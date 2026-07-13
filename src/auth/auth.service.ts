import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/signUp.dto';
import { type EmailVerificationRepository } from './model/email-verification.interface';
import { EConflictException } from '../global/exceptions/EConflictException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { TypeOrmEmailVerificationRepository } from './model/email-verification.repository';
import { SendEmailVerificationDto } from './dto/sendEmailVerification.dto';
import { NodeMailer } from './providors/nodeMailer';
import { EServiceUnavailableException } from '../global/exceptions/EServiceUnavailableException';
import { VerifyEmailVerificationDto } from './dto/verifyEmailVerification.dto';
import { LoginDto } from './dto/login.dto';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { EUnauthorizedException } from '../global/exceptions/EUnauthorizedException';
import { EBadRequestException } from '../global/exceptions/EBadRequestException';
import { JwtPayload } from './types/jwtPayload.type';
import { JwtService } from '@nestjs/jwt';
import { TypedConfigService } from '../configs/typedConfig.service';
import { type AuthTokenRepository } from './model/auth-token.interface';
import { TypeOrmAuthTokenRepository } from './model/auth-token.repository';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { VerificationPurpose } from '../global/constants/verificationPurpose.enum';
import { BiometricType } from '../global/constants/biometricType.enum';
import { DeviceToken } from '../notifications/entities/device-token.entity';
import { Platform } from '../global/constants/platform.enum';
import { PinLoginDto } from './dto/pinLogin.dto';
import { VerifyPasswordDto } from './dto/verifyPassword.dto';
import { UpdatePasswordDto } from './dto/updatePassword.dto';
import { rPassword } from '../global/reg';
import { BiometricEnableDto } from './dto/biometricEnable.dto';
import { BiometricChallengeDto } from './dto/biometricChallenge.dto';
import { BiometricVerifyDto } from './dto/biometricVerify.dto';
import { type BiometricChallengeRepository } from './model/biometric-challenge.interface';
import { TypeOrmBiometricChallengeRepository } from './model/biometric-challenge.repository';
import { PIN_MAX_FAILED_ATTEMPTS } from '../global/constants/pin.const';
import { FcmService } from '../notifications/providers/fcm.service';
import { FCM_TOPIC_ALL_USERS } from '../global/constants/fcmTopic.const';

@Injectable()
export class AuthService {
  constructor(
    @Inject(TypeOrmEmailVerificationRepository)
    private readonly emailVerificationRepository: EmailVerificationRepository,
    @Inject(TypeOrmAuthTokenRepository)
    private readonly authTokenRepository: AuthTokenRepository,
    @Inject(TypeOrmBiometricChallengeRepository)
    private readonly biometricChallengeRepository: BiometricChallengeRepository,
    private readonly usersService: UsersService,
    private readonly nodeMailer: NodeMailer,
    private readonly jwtService: JwtService,
    private readonly configService: TypedConfigService,
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepo: Repository<DeviceToken>,
    private readonly fcmService: FcmService,
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

  async verifyPassword(userId: string, dto: VerifyPasswordDto) {
    const user = await this.usersService.getOneUser(userId);

    if (typeof dto.password !== 'string' || !dto.password) {
      throw new EUnauthorizedException({
        message: 'Invalid password.',
        errorCode: ERROR_CODE.INVALID_PASSWORD,
      });
    }

    const isValid = await bcrypt.compare(dto.password, user.password);

    if (!isValid) {
      throw new EUnauthorizedException({
        message: 'Invalid password.',
        errorCode: ERROR_CODE.INVALID_PASSWORD,
      });
    }

    return { valid: true };
  }

  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.usersService.getOneUser(userId);

    if (typeof dto.current_password !== 'string' || !dto.current_password) {
      throw new EUnauthorizedException({
        message: 'Invalid password.',
        errorCode: ERROR_CODE.INVALID_PASSWORD,
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.current_password,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new EUnauthorizedException({
        message: 'Invalid password.',
        errorCode: ERROR_CODE.INVALID_PASSWORD,
      });
    }

    if (
      typeof dto.new_password !== 'string' ||
      !rPassword.test(dto.new_password)
    ) {
      throw new EBadRequestException({
        message:
          'New password must contain at least one letter and one number and be 8-20 characters long.',
        errorCode: ERROR_CODE.INVALID_NEW_PASSWORD_FORMAT,
      });
    }

    const isSamePassword = await bcrypt.compare(
      dto.new_password,
      user.password,
    );

    if (isSamePassword) {
      throw new EBadRequestException({
        message: 'New password must be different from current password.',
        errorCode: ERROR_CODE.INVALID_NEW_PASSWORD_FORMAT,
      });
    }

    const hashedPw = await bcrypt.hash(dto.new_password, 10);
    await this.usersService.updateUser(userId, { password: hashedPw });

    return { success: true };
  }

  async login(loginDto: LoginDto) {
    const {
      email,
      password,
      deviceToken,
      platform,
      stayLoggedIn = false,
    } = loginDto;

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

    const { accessToken, refreshToken } = this.signTokens(
      dbUser.userId,
      stayLoggedIn,
    );

    await this.authTokenRepository.deleteByUserId(dbUser.userId);
    await this.authTokenRepository.createToken({
      userId: dbUser.userId,
      accessToken,
      refreshToken,
    });

    // 디바이스 토큰이 함께 전달되면 등록/재할당
    if (deviceToken && platform) {
      await this.upsertDeviceToken(dbUser.userId, deviceToken, platform);
    }

    return { accessToken, stayLoggedIn };
  }

  async loginWithPin(pinLoginDto: PinLoginDto) {
    const {
      email,
      pinNumber,
      deviceToken,
      platform,
      stayLoggedIn = false,
    } = pinLoginDto;

    // email로 유저를 특정하기 때문에 같은 PIN을 가진 다른 유저로 로그인되는 버그 없음
    const [dbUser] = await this.usersService.getUsers({ email });

    if (!dbUser)
      throw new ENotFoundException({
        message: '존재하지 않는 계정입니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });

    const security = await this.usersService.getUserSecurity(dbUser.userId);

    if (!security || !security.pinHash)
      throw new EUnauthorizedException({
        message: 'PIN이 설정되어 있지 않습니다.',
        errorCode: ERROR_CODE.PIN_NOT_SET,
      });

    if (security.pinFailedCount >= PIN_MAX_FAILED_ATTEMPTS)
      throw new EUnauthorizedException({
        message: 'PIN 입력 횟수를 초과했습니다. 이메일 로그인을 이용해주세요.',
        errorCode: ERROR_CODE.PIN_LOCKED,
      });

    const isValid = await bcrypt.compare(pinNumber, security.pinHash);

    if (!isValid) {
      await this.usersService.incrementPinFailedCount(dbUser.userId);
      throw new EUnauthorizedException({
        message: 'PIN이 일치하지 않습니다.',
        errorCode: ERROR_CODE.INVALID_PIN,
      });
    }

    await this.usersService.resetPinFailedCount(dbUser.userId);

    const { accessToken, refreshToken } = this.signTokens(
      dbUser.userId,
      stayLoggedIn,
    );

    await this.authTokenRepository.deleteByUserId(dbUser.userId);
    await this.authTokenRepository.createToken({
      userId: dbUser.userId,
      accessToken,
      refreshToken,
    });

    if (deviceToken && platform) {
      await this.upsertDeviceToken(dbUser.userId, deviceToken, platform);
    }

    return { accessToken, stayLoggedIn };
  }

  async logout(userId: string): Promise<void> {
    await this.authTokenRepository.deleteByUserId(userId);
  }

  /*
    FCM 토큰 문자열로 비활성화 — silent fail
    클라이언트가 내부 tokenId를 모르더라도 FCM 토큰만으로 비활성화 가능
  */
  async deactivateDeviceTokenByFcmString(token: string): Promise<void> {
    await this.deviceTokenRepo.update({ token }, { isActive: false });
    await this.fcmService.unsubscribeFromTopic([token], FCM_TOPIC_ALL_USERS);
  }

  /*
    로그인 시 디바이스 토큰 등록/재할당
    - 동일 FCM 토큰이 다른 유저에게 있으면 현재 유저로 재할당 (기기 공유 시 이전 유저에게 알림 가지 않도록)
    - 동일 FCM 토큰이 이미 이 유저 것이면 isActive=true로 재활성화
    - 없으면 새로 생성
  */
  private async upsertDeviceToken(
    userId: string,
    token: string,
    platform: Platform,
  ): Promise<void> {
    const existing = await this.deviceTokenRepo.findOne({ where: { token } });
    if (existing) {
      await this.deviceTokenRepo.update(
        { tokenId: existing.tokenId },
        { userId, isActive: true },
      );
    } else {
      const newToken = this.deviceTokenRepo.create({
        userId,
        token,
        platform,
        isActive: true,
      });
      await this.deviceTokenRepo.save(newToken);
    }

    await this.fcmService.subscribeToTopic([token], FCM_TOPIC_ALL_USERS);
  }

  async setBiometric(userId: string, dto: BiometricEnableDto) {
    const { enabled, biometric_type, public_key } = dto;

    if (enabled) {
      if (!biometric_type) {
        throw new EBadRequestException({
          message: '생체인증 방식은 필수입니다.',
          errorCode: ERROR_CODE.BIOMETRIC_TYPE_REQUIRED,
        });
      }
      if (
        !Object.values(BiometricType).includes(biometric_type as BiometricType)
      ) {
        throw new EBadRequestException({
          message: '지원하지 않는 생체인증 방식입니다.',
          errorCode: ERROR_CODE.BIOMETRIC_TYPE_INVALID,
        });
      }
      if (!public_key) {
        throw new EBadRequestException({
          message: '공개키는 필수입니다.',
          errorCode: ERROR_CODE.PUBLIC_KEY_REQUIRED,
        });
      }
    }

    const updated = await this.usersService.updateBiometric(
      userId,
      enabled,
      enabled ? (biometric_type as BiometricType) : null,
      enabled ? public_key! : null,
    );

    return {
      success: true,
      is_biometric_enabled: updated.biometricEnabled,
      biometric_type: updated.biometricType,
    };
  }

  async createBiometricChallenge(dto: BiometricChallengeDto) {
    const [user] = await this.usersService.getUsers({ email: dto.email });

    if (!user) {
      throw new ENotFoundException({
        message: '존재하지 않는 계정입니다.',
        errorCode: ERROR_CODE.USER_NOT_FOUND,
      });
    }

    const security = await this.usersService.getUserSecurity(user.userId);

    if (!security?.biometricEnabled) {
      throw new EBadRequestException({
        message: '생체인증이 등록되지 않은 계정입니다.',
        errorCode: ERROR_CODE.BIOMETRIC_NOT_ENABLED,
      });
    }

    const challenge = crypto.randomBytes(32).toString('base64');
    const record = await this.biometricChallengeRepository.createChallenge(
      user.userId,
      challenge,
      this.getExpiresAt(5),
    );

    return {
      challenge: record.challenge,
      challenge_id: record.challengeId,
    };
  }

  async verifyBiometricChallenge(dto: BiometricVerifyDto, res: any) {
    const { challenge_id, signature } = dto;

    const record =
      await this.biometricChallengeRepository.findByChallengeId(challenge_id);

    if (!record || record.isUsed || this.isExpired(record.expiresAt)) {
      throw new EUnauthorizedException({
        message: '생체인증에 실패했습니다.',
        errorCode: ERROR_CODE.BIOMETRIC_AUTH_FAILED,
      });
    }

    const security = await this.usersService.getUserSecurity(record.userId);

    if (!security?.publicKey) {
      throw new EUnauthorizedException({
        message: '생체인증에 실패했습니다.',
        errorCode: ERROR_CODE.BIOMETRIC_AUTH_FAILED,
      });
    }

    let isValid = false;
    try {
      isValid = crypto
        .createVerify('SHA256')
        .update(record.challenge)
        .verify(security.publicKey, signature, 'base64');
    } catch {
      // 서명 형식이 잘못된 경우도 실패로 처리
    }

    if (!isValid) {
      throw new EUnauthorizedException({
        message: '생체인증에 실패했습니다.',
        errorCode: ERROR_CODE.BIOMETRIC_AUTH_FAILED,
      });
    }

    await this.biometricChallengeRepository.markAsUsed(challenge_id);

    const payload: JwtPayload = { sub: record.userId };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

    await this.authTokenRepository.deleteByUserId(record.userId);
    await this.authTokenRepository.createToken({
      userId: record.userId,
      accessToken,
      refreshToken,
    });

    res.cookie('X-Access-Token', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });
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

  signTokens(userId: string, stayLoggedIn: boolean = false) {
    const payload: JwtPayload = { sub: userId, stayLoggedIn };

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
