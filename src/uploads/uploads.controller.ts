import {
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/auth.guard';
import { UploadsService } from './uploads.service';
import { UploadTempFileDto } from './dto/uploadTempFile.dto';
import { MAX_FILE_SIZE } from './const/upload.const';
import { RequestAiAnalyseDto } from './dto/requestAiAnalyse.dto';
import { ReorderTempFilesDto } from './dto/reorderTempFiles.dto';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('start')
  startUpload(@Req() req: any) {
    return this.uploadsService.startUpload(req.user.userId);
  }

  @Get('temp-list')
  getTempDocumentList(@Req() req: any) {
    return this.uploadsService.getTempDocumentList(req.user.userId);
  }

  @Get(':tempDocumentId')
  getTempDocumentStatus(
    @Req() req: any,
    @Param('tempDocumentId', ParseUUIDPipe) tempDocumentId: string,
  ) {
    return this.uploadsService.getTempDocumentStatus(
      req.user.userId,
      tempDocumentId,
    );
  }

  @Post(':tempDocumentId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  uploadTempFile(
    @Req() req: any,
    @Param('tempDocumentId', ParseUUIDPipe) tempDocumentId: string,
    @Body() dto: UploadTempFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadsService.uploadTempFile(
      req.user.userId,
      tempDocumentId,
      dto.pageNo,
      file,
    );
  }

  @Patch(':tempDocumentId/reorder')
  reorderTempFiles(
    @Req() req: any,
    @Param('tempDocumentId', ParseUUIDPipe) tempDocumentId: string,
    @Body() dto: ReorderTempFilesDto,
  ) {
    return this.uploadsService.reorderTempFiles(
      req.user.userId,
      tempDocumentId,
      dto,
    );
  }

  @Delete(':tempDocumentId')
  deleteTempDocument(
    @Req() req: any,
    @Param('tempDocumentId', ParseUUIDPipe) tempDocumentId: string,
  ) {
    return this.uploadsService.deleteTempDocument(
      req.user.userId,
      tempDocumentId,
    );
  }

  @Delete(':tempDocumentId/files')
  deleteAllTempFiles(
    @Req() req: any,
    @Param('tempDocumentId', ParseUUIDPipe) tempDocumentId: string,
  ) {
    return this.uploadsService.deleteAllTempFiles(req.user.userId, tempDocumentId);
  }

  @Delete(':tempDocumentId/files/:fileId')
  deleteTempFile(
    @Req() req: any,
    @Param('tempDocumentId', ParseUUIDPipe) tempDocumentId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.uploadsService.deleteTempFile(req.user.userId, tempDocumentId, fileId);
  }

  @Post(':tempDocumentId/ai')
  requestAi(
    @Req() req: any,
    @Param('tempDocumentId', ParseUUIDPipe) tempDocumentId: string,
    @Body() requestAiAnalyseDto: RequestAiAnalyseDto,
  ) {
    return this.uploadsService.requestAi(
      req.user.userId,
      tempDocumentId,
      requestAiAnalyseDto,
    );
  }
}
