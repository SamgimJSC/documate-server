import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { TempDocument } from './entities/temp-document.entity';
import { TempFile } from './entities/temp-file.entity';
import { TypeOrmTempDocumentRepository } from './model/temp-document.repository';
import { TypeOrmTempFileRepository } from './model/temp-file.repository';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    TypeOrmModule.forFeature([TempDocument, TempFile]),
  ],
  controllers: [UploadsController],
  providers: [
    UploadsService,
    TypeOrmTempDocumentRepository,
    TypeOrmTempFileRepository,
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
