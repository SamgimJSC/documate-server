import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocumentCategory } from './entities/document-category.entity';
import { Document } from './entities/document.entity';
import { DocumentActivity } from './entities/document-activity.entity';
import { Tag } from './entities/tag.entity';
import { DocumentTag } from './entities/document-tag.entity';
import { DocumentAlert } from './entities/document-alert.entity';
import { TypeOrmDocumentCategoryRepository } from './model/document-category.repository';
import { TypeOrmDocumentRepository } from './model/document.repository';
import { TypeOrmDocumentActivityRepository } from './model/document-activity.repository';
import { TypeOrmTagRepository } from './model/tag.repository';
import { TypeOrmDocumentTagRepository } from './model/document-tag.repository';
import { TypeOrmDocumentAlertRepository } from './model/document-alert.repository';
import { DocumentFile } from './entities/document-file.entity';
import { TypeOrmDocumentFileRepository } from './model/document-file.repository';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      DocumentCategory,
      Document,
      DocumentActivity,
      Tag,
      DocumentTag,
      DocumentAlert,
      DocumentFile,
    ]),
  ],
  controllers: [DocumentsController],
  exports: [TypeOrmModule, DocumentsService],
  providers: [
    DocumentsService,
    TypeOrmDocumentCategoryRepository,
    TypeOrmDocumentRepository,
    TypeOrmDocumentActivityRepository,
    TypeOrmTagRepository,
    TypeOrmDocumentTagRepository,
    TypeOrmDocumentAlertRepository,
    TypeOrmDocumentFileRepository,
  ],
})
export class DocumentsModule {}
