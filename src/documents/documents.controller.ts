import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/createDocument.dto';
import { UpdateDocumentDto } from './dto/updateDocument.dto';
import { UpdateDocumentCategoryDto } from './dto/updateDocumentCategory.dto';
import { GetDocumentsQueryDto } from './dto/getDocumentsQuery.dto';
import { ToggleFavoriteDto } from './dto/toggleFavorite.dto';
import { AddDocumentTagDto } from './dto/addDocumentTag.dto';
import { ReorderDocumentFilesDto } from './dto/reorderDocumentFiles.dto';
import { CreateAlertRequestDto } from './dto/createAlertRequest.dto';
import { UpdateAlertRequestDto } from './dto/updateAlertRequest.dto';

@UseGuards(JwtAuthGuard)
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ── 카테고리 / 태그 ──────────────────────────────────────────
  // static routes must be declared before /:documentId to prevent param capture
  @Get('categories')
  getCategories() {
    return this.documentsService.getCategories();
  }

  @Patch('categories/:categoryId')
  updateCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: UpdateDocumentCategoryDto,
  ) {
    return this.documentsService.updateCategory(categoryId, dto);
  }

  @Get('tags')
  getTags(@Req() req: any) {
    return this.documentsService.getTags(req.user.userId);
  }

  // ── 문서 CRUD ────────────────────────────────────────────────
  @Post()
  createDocument(@Req() req: any, @Body() dto: CreateDocumentDto) {
    return this.documentsService.createDocument(req.user.userId, dto);
  }

  @Get()
  getDocuments(@Req() req: any, @Query() query: GetDocumentsQueryDto) {
    return this.documentsService.getDocuments(req.user.userId, query);
  }

  @Get(':documentId')
  getDocumentById(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documentsService.getDocumentById(documentId, req.user.userId);
  }

  @Patch(':documentId')
  updateDocument(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(
      documentId,
      req.user.userId,
      dto,
    );
  }

  @Patch(':documentId/favorite')
  toggleFavorite(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ToggleFavoriteDto,
  ) {
    return this.documentsService.toggleFavorite(
      documentId,
      req.user.userId,
      dto,
    );
  }

  @Delete(':documentId')
  deleteDocument(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documentsService.deleteDocument(documentId, req.user.userId);
  }

  // ── 태그 ────────────────────────────────────────────────────
  @Post(':documentId/tags')
  addDocumentTag(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: AddDocumentTagDto,
  ) {
    return this.documentsService.addDocumentTag(
      documentId,
      req.user.userId,
      dto,
    );
  }

  @Delete(':documentId/tags/:tagId')
  removeDocumentTag(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.documentsService.removeDocumentTag(
      documentId,
      req.user.userId,
      tagId,
    );
  }

  @Patch(':documentId/files/reorder')
  reorderDocumentFiles(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: ReorderDocumentFilesDto,
  ) {
    return this.documentsService.reorderDocumentFiles(
      documentId,
      req.user.userId,
      dto,
    );
  }

  @Get(':documentId/ai-status')
  getDocumentAiStatus(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documentsService.getDocumentAiStatus(
      documentId,
      req.user.userId,
    );
  }

  // ── 알림 설정 ────────────────────────────────────────────────
  @Post(':documentId/alerts')
  createAlert(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Body() dto: CreateAlertRequestDto,
  ) {
    return this.documentsService.createAlert(documentId, req.user.userId, dto);
  }

  @Get(':documentId/alerts')
  getAlerts(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documentsService.getAlertsByDocument(
      documentId,
      req.user.userId,
    );
  }

  @Patch(':documentId/alerts/:alertId')
  updateAlert(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Param('alertId', ParseUUIDPipe) alertId: string,
    @Body() dto: UpdateAlertRequestDto,
  ) {
    return this.documentsService.updateAlert(
      documentId,
      req.user.userId,
      alertId,
      dto,
    );
  }

  @Delete(':documentId/alerts/:alertId')
  deleteAlert(
    @Req() req: any,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @Param('alertId', ParseUUIDPipe) alertId: string,
  ) {
    return this.documentsService.deleteAlert(
      documentId,
      req.user.userId,
      alertId,
    );
  }
}
