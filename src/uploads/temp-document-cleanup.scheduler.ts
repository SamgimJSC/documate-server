import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TypeOrmTempDocumentRepository } from './model/temp-document.repository';

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
}
