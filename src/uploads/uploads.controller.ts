import {
  Controller,
  Get,
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

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Get('start')
  startUpload(@Req() req: any) {
    return this.uploadsService.startUpload(req.user.userId);
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
}
