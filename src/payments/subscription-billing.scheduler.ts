import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PaymentsService } from './payments.service';

@Injectable()
export class SubscriptionBillingScheduler {
  private readonly logger = new Logger(SubscriptionBillingScheduler.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Cron('0 1 * * *')
  async handleMonthlyBilling() {
    const { total, approved, failed, canceled } =
      await this.paymentsService.runMonthlySubscriptionBilling();

    this.logger.log(
      `정기결제 배치 완료: 총 ${total}건 (승인 ${approved}, 실패 ${failed}, 해지 ${canceled})`,
    );
  }
}
