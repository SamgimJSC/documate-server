import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AiAnalysisBodyDto } from './dto/aiAnalysisBody.dto';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('ai')
  @HttpCode(HttpStatus.CREATED)
  requestAiAnalysis(@Body() body: AiAnalysisBodyDto) {
    return this.documentsService.enqueueAiAnalysis(body);
  }
}
