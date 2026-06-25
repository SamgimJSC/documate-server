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
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationScheduler } from './notification.scheduler';
import { CreateNotificationBodyDto } from './dto/createNotificationBody.dto';
import { RegisterDeviceTokenDto } from './dto/registerDeviceToken.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DecoUser } from '../global/decorators/decoUser.decorator';
import { type ReqUser } from '../global/types/express';

/*
  알림 API

  - 모든 엔드포인트에 JwtAuthGuard 적용 → 로그인된 사용자만 호출 가능
  - 로그인 사용자는 @DecoUser()로 받음

  라우트 순서 주의:
     동적 라우트(:id)보다 고정 라우트(read-all, device-tokens)가 먼저 와야
     "read-all"을 UUID로 파싱하려는 충돌이 안 생김!
*/
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  // ====================================================================
  // GET /notifications
  // 내 알림 목록 조회 (최신순)
  // ====================================================================
  @Get()
  getMyNotifications(@DecoUser() user: ReqUser) {
    return this.notificationsService.getMyNotifications(user.userId);
  }

  // ====================================================================
  // POST /notifications
  // 알림 생성 (테스트/내부용)
  // ====================================================================
  @Post()
  createNotification(
    @DecoUser() user: ReqUser,
    @Body() body: CreateNotificationBodyDto,
  ) {
    return this.notificationsService.createNotification(user.userId, body);
  }

  // ====================================================================
  // PATCH /notifications/read-all
  // 내 알림 전체 읽음 처리 (응답 본문 없음, 204)
  // ⚠️ /:id/read 보다 먼저 선언!
  // ====================================================================
  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllAsRead(@DecoUser() user: ReqUser) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  // ====================================================================
  // POST /notifications/device-tokens
  // FCM 디바이스 토큰 등록 (앱/웹에서 Firebase 토큰 받아 호출)
  // Body: { "token": "fGx9...", "platform": "IOS" }
  // ====================================================================
  @Post('device-tokens')
  registerDeviceToken(
    @DecoUser() user: ReqUser,
    @Body() body: RegisterDeviceTokenDto,
  ) {
    return this.notificationsService.registerDeviceToken(user.userId, body);
  }

  // ====================================================================
  // DELETE /notifications/device-tokens/:tokenId
  // 디바이스 토큰 해제 (로그아웃 시 등)
  // ====================================================================
  @Delete('device-tokens/:tokenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDeviceToken(
    @DecoUser() user: ReqUser,
    @Param('tokenId', ParseUUIDPipe) tokenId: string,
  ) {
    return this.notificationsService.removeDeviceToken(user.userId, tokenId);
  }

  // ====================================================================
  // POST /notifications/trigger-scheduler
  // 스케줄러 수동 실행 (개발 테스트용)
  // notify_date <= 오늘 && is_sent=false 인 document_alerts 처리
  // ====================================================================
  @Post('trigger-scheduler')
  async triggerScheduler() {
    await this.notificationScheduler.dispatchDueAlerts();
    return { triggered: true };
  }

  // ====================================================================
  // PATCH /notifications/:id/read
  // 알림 단건 읽음 처리 (204)
  // ====================================================================
  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAsRead(
    @DecoUser() user: ReqUser,
    @Param('id', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationsService.markAsRead(user.userId, notificationId);
  }

  // ====================================================================
  // DELETE /notifications/:id
  // 알림 단건 삭제 (204)
  // ====================================================================
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeNotification(
    @DecoUser() user: ReqUser,
    @Param('id', ParseUUIDPipe) notificationId: string,
  ) {
    return this.notificationsService.removeNotification(
      user.userId,
      notificationId,
    );
  }
}
