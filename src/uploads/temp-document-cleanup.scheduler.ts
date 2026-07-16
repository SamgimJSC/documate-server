import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TypeOrmTempDocumentRepository } from './model/temp-document.repository';
import {
  TEMP_DOCUMENT_PENDING_TIMEOUT_MINUTES,
  TEMP_DOCUMENT_PROCESSING_TIMEOUT_MINUTES,
} from './const/upload.const';

@Injectable()
export class TempDocumentCleanupScheduler {
  private readonly logger = new Logger(TempDocumentCleanupScheduler.name);

  constructor(
    private readonly tempDocumentRepository: TypeOrmTempDocumentRepository,
  ) {}

  @Cron('0 3 * * *')
  async handleCleanup() {
    const deleted = await this.tempDocumentRepository.deleteExpired(3);
    this.logger.log(`임시 문서 정리 완료: ${deleted}건 삭제`);
  }

  // 큐에서 못 꺼내가거나(PENDING) 워커가 멈춰서(PROCESSING) 너무 오래
  // 걸린 건을 FAILED 로 전환한다. 유저는 기존 재시도 API로 다시 시도할 수 있다.
  @Cron(CronExpression.EVERY_MINUTE)
  async handleStaleTimeout() {
    const failed = await this.tempDocumentRepository.markStaleAsFailed(
      TEMP_DOCUMENT_PENDING_TIMEOUT_MINUTES,
      TEMP_DOCUMENT_PROCESSING_TIMEOUT_MINUTES,
    );
    if (failed > 0) {
      this.logger.warn(`AI 분석 타임아웃으로 FAILED 전환: ${failed}건`);
    }
  }
}
