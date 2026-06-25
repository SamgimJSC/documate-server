import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { TempDocument } from './entities/temp-document.entity';
import { TempFile } from './entities/temp-file.entity';
import { TypeOrmTempDocumentRepository } from './model/temp-document.repository';
import { TypeOrmTempFileRepository } from './model/temp-file.repository';
import { TempDocumentCleanupScheduler } from './temp-document-cleanup.scheduler';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([TempDocument, TempFile])],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    TypeOrmTempDocumentRepository,
    TypeOrmTempFileRepository,
    TempDocumentCleanupScheduler,
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
