import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/signUp.dto';
import { type EmailVerificationRepository } from './model/email-verification.interface';
import { EConflictException } from '../global/exceptions/EConflictException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { SHA256 } from 'crypto-js';

@Injectable()
export class AuthService {
  constructor(
    // private readonly configService: TypedConfigService,
    private readonly usersService: UsersService,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    // private readonly jwtService: JwtService,
    // private readonly nodeMailer: NodeMailer,
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

    const hashedPw = SHA256(password).toString();

    const hashedPin = SHA256(pinNumber).toString();

    const createdUser = await this.usersService.createUser(
      { email, nickname, password: hashedPw },
      hashedPin,
    );

    return createdUser;
  }

  //   async login(loginDto: LoginDto) {
  //     const { email, password } = loginDto;

  //     const [dbUser] = await this.userService.findUser({
  //       where: { email },
  //       select: {
  //         userId: true,
  //         password: true,
  //       },
  //     });

  //     if (!dbUser)
  //       throw new ENotFoundException({
  //         message: '존재하지 않는 이메일입니다.',
  //         errorCode: ERROR_CODE.USER_NOT_FOUND,
  //       });

  //     const dbPw = dbUser.password;

  //     const isValid = await this.verifyPassword(password, dbPw);

  //     if (!isValid)
  //       throw new EUnauthorizedException({
  //         message: '비밀번호가 일치하지 않습니다.',
  //         errorCode: ERROR_CODE.INVALID_PASSWORD,
  //       });

  //     const { accessToken, refreshToken } = await this.signTokens(dbUser.userId);

  //     await this.userService.setTokens(dbUser.userId, accessToken, refreshToken);

  //     return { accessToken };
  //   }

  //   async emailVerificationSignup(emailVerificationDto: EmailVerificationDto) {
  //     const { email } = emailVerificationDto;

  //     const [user] = await this.userService.findOneByEmail(email);

  //     if (user) {
  //       throw new EConflictException({
  //         message: '이미 존재하는 이메일 입니다.',
  //         errorCode: ERROR_CODE.EMAIL_ALREADY_USED,
  //       });
  //     }

  //     const token = await this.signEmailVerificationToken(email);

  //     try {
  //       await this.nodeMailer.sendEmail({
  //         to: email,
  //         subject: '[솔링북] 회원가입 이메일 인증을 위한 링크입니다.',
  //         link: `${this.configService.get('BASE_URL')}/signup?t=${token}`,
  //       });
  //     } catch (err) {
  //       console.error(err);

  //       throw new EServiceUnavailableException({
  //         message: '이메일 전송에 실패했습니다.',
  //         errorCode: ERROR_CODE.EMAIL_SEND_FAILURE,
  //       });
  //     }
  //   }

  //   async hash(password: string) {
  //     return bcrypt.hash(password, 10);
  //   }

  //   async signEmailVerificationToken(email: string) {
  //     const payload: JwtPayload = { sub: email };

  //     return this.jwtService.sign(payload, { expiresIn: '5s' });
  //   }

  //   async signTokens(userId: string) {
  //     const payload: JwtPayload = { sub: userId };

  //     const accessToken = this.jwtService.sign(payload);
  //     const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });

  //     return { accessToken, refreshToken };
  //   }

  //   async verifyToken(token: string) {
  //     try {
  //       this.jwtService.verify(token, {
  //         secret: this.configService.get('JWT_SECRET'),
  //       });
  //     } catch (err) {
  //       console.error(err);

  //       throw new EUnauthorizedException({
  //         message: '유효한 토큰이 아닙니다.',
  //         errorCode: ERROR_CODE.INVALID_TOKEN,
  //       });
  //     }
  //   }

  //   private async verifyPassword(newPw: string, dbPw: string) {
  //     return await bcrypt.compare(newPw, dbPw);
  //   }
}
