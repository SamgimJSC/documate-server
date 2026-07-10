import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DecoUser } from '../global/decorators/decoUser.decorator';
import { type ReqUser } from '../global/types/express';
import { CancelSubscriptionDto } from './dto/cancelSubscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  getMySubscription(@DecoUser() user: ReqUser) {
    return this.subscriptionsService.getMySubscription(user);
  }

  @Patch('me/cancel')
  cancelMySubscription(
    @DecoUser() user: ReqUser,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.subscriptionsService.cancelMySubscription(user, dto);
  }

  @Patch('me/cancel/undo')
  undoCancelMySubscription(@DecoUser() user: ReqUser) {
    return this.subscriptionsService.undoCancelMySubscription(user);
  }
}
