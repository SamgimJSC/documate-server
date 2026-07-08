import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/createUser.dto';
import { GetUsersQueryDto } from './dto/getUsersQuery.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { UpdateUserSettingsDto } from './dto/updateUserSettings.dto';
import { UpdatePinDto } from './dto/updatePin.dto';
import { VerifyPinDto } from './dto/verifyPin.dto';
import { UpdateNicknameDto } from './dto/updateNickname.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DecoUser } from '../global/decorators/decoUser.decorator';
import { User } from './entities/user.entity';
import type { ReqUser } from '../global/types/express';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getUsers(
    @Query(new ValidationPipe({ transform: true }))
    query: GetUsersQueryDto,
  ) {
    return this.usersService.getUsers(query);
  }

  @Get('me')
  getMe(@DecoUser() user: User) {
    return this.usersService.getOneUser(user.userId);
  }

  @Patch('me/nickname')
  updateMyNickname(@DecoUser() user: ReqUser, @Body() dto: UpdateNicknameDto) {
    return this.usersService.updateMyNickname(user.userId, dto);
  }

  // ====================================================================
  // GET /users/me/settings
  // 내 알림/앱 설정 조회
  // ====================================================================
  @Get('me/settings')
  getMySettings(@DecoUser() user: ReqUser) {
    return this.usersService.getUserSettings(user.userId);
  }

  // ====================================================================
  // PATCH /users/me/settings
  // 내 알림/앱 설정 변경 (pushEnabled, emailNotiEnabled 등)
  // ====================================================================
  @Patch('me/settings')
  updateMySettings(
    @DecoUser() user: ReqUser,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    return this.usersService.updateUserSettings(user.userId, dto);
  }

  @Get(':id')
  getOneUser(@Param('id', ParseUUIDPipe) userId: string) {
    return this.usersService.getOneUser(userId);
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Post('me/pin/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  verifyPin(@DecoUser() user: User, @Body() body: VerifyPinDto) {
    return this.usersService.verifyPin(user.userId, body.pinNumber);
  }

  @Patch('me/pin')
  @HttpCode(HttpStatus.NO_CONTENT)
  updatePin(@DecoUser() user: User, @Body() updatePinDto: UpdatePinDto) {
    return this.usersService.updatePin(user.userId, updatePinDto);
  }

  @Patch(':id')
  updateUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(userId, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(
    @Param('id', ParseUUIDPipe) userId: string,
    @Query('reason') reason?: string,
  ) {
    return this.usersService.deleteUser(userId, reason);
  }
}
