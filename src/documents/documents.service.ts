import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import {
  DOCUMENT_DEFAULT_PAGE,
  DOCUMENT_DEFAULT_LIMIT,
} from '../global/constants/document-limit.const';
import { TypeOrmDocumentRepository } from './model/document.repository';
import { TypeOrmDocumentCategoryRepository } from './model/document-category.repository';
import { TypeOrmDocumentFileRepository } from './model/document-file.repository';
import { TypeOrmTagRepository } from './model/tag.repository';
import { TypeOrmDocumentTagRepository } from './model/document-tag.repository';
import { TypeOrmDocumentActivityRepository } from './model/document-activity.repository';
import { TypeOrmDocumentAlertRepository } from './model/document-alert.repository';
import { CreateDocumentDto } from './dto/createDocument.dto';
import { UpdateDocumentDto } from './dto/updateDocument.dto';
import { GetDocumentsQueryDto } from './dto/getDocumentsQuery.dto';
import { ToggleFavoriteDto } from './dto/toggleFavorite.dto';
import { UpdateDocumentLockDto } from './dto/updateDocumentLock.dto';
import { UnlockDocumentDto } from './dto/unlockDocument.dto';
import { AddDocumentTagDto } from './dto/addDocumentTag.dto';
import { ReorderDocumentFilesDto } from './dto/reorderDocumentFiles.dto';
import { CreateAlertRequestDto } from './dto/createAlertRequest.dto';
import { UpdateAlertRequestDto } from './dto/updateAlertRequest.dto';
import { UpdateDocumentCategoryDto } from './dto/updateDocumentCategory.dto';
import { Document } from './entities/document.entity';
import { User } from '../users/entities/user.entity';
import { DocumentCategory } from './entities/document-category.entity';
import { DocumentFile } from './entities/document-file.entity';
import { DocumentAlert } from './entities/document-alert.entity';
import { DocumentActivity } from './entities/document-activity.entity';
import { Tag } from './entities/tag.entity';
import { DocumentTag } from './entities/document-tag.entity';
import { AiStatus } from '../global/constants/aiStatus.enum';
import { InputMethod } from '../global/constants/inputMethod.enum';
import { DocumentActivityType } from '../global/constants/documentActivityType.enum';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { EConflictException } from '../global/exceptions/EConflictException';
import { EBadRequestException } from '../global/exceptions/EBadRequestException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { PDFDocument } from 'pdf-lib';
import axios from 'axios';
import { UploadsService } from '../uploads/uploads.service';
import { NotificationScheduler } from '../notifications/notification.scheduler';
import { UsersService } from '../users/users.service';
import { EUnauthorizedException } from '../global/exceptions/EUnauthorizedException';
import { DocumentUnlockPayload } from './types/documentUnlockPayload.type';

const DOCUMENT_UNLOCK_TOKEN_TTL_SECONDS = 600;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly documentRepository: TypeOrmDocumentRepository,
    private readonly documentCategoryRepository: TypeOrmDocumentCategoryRepository,
    private readonly documentFileRepository: TypeOrmDocumentFileRepository,
    private readonly tagRepository: TypeOrmTagRepository,
    private readonly documentTagRepository: TypeOrmDocumentTagRepository,
    private readonly documentActivityRepository: TypeOrmDocumentActivityRepository,
    private readonly documentAlertRepository: TypeOrmDocumentAlertRepository,
    private readonly uploadsService: UploadsService,
    private readonly notificationScheduler: NotificationScheduler,
    private readonly usersService: UsersService,
  ) {}

  async getCategories(): Promise<DocumentCategory[]> {
    return this.documentCategoryRepository.findAll();
  }

  async updateCategory(categoryId: number, dto: UpdateDocumentCategoryDto): Promise<DocumentCategory> {
    const updated = await this.documentCategoryRepository.updateById(categoryId, dto);
    if (!updated) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_CATEGORY_NOT_FOUND,
        message: '존재하지 않는 카테고리입니다.',
      });
    }
    return updated;
  }

  async getTags(userId: string): Promise<Tag[]> {
    return this.tagRepository.findByUserId(userId);
  }

  async createDocument(
    userId: string,
    dto: CreateDocumentDto,
  ): Promise<Document> {
    if (dto.categoryId != null) {
      const category = await this.documentCategoryRepository.findById(
        dto.categoryId,
      );
      if (!category) {
        throw new ENotFoundException({
          errorCode: ERROR_CODE.DOCUMENT_CATEGORY_NOT_FOUND,
          message: '존재하지 않는 카테고리입니다.',
        });
      }
    }

    const document = await this.documentRepository.createDocument({
      ...dto,
      userId,
      aiStatus:
        dto.inputMethod === InputMethod.OCR ? AiStatus.PENDING : AiStatus.DONE,
      isConfirmed: dto.inputMethod !== InputMethod.OCR,
    });

    if (dto.files && dto.files.length > 0) {
      for (const file of dto.files) {
        await this.documentFileRepository.insert({
          documentId: document.documentId,
          fileUrl: file.fileUrl,
          pageNo: file.pageNo,
        });
      }
    }

    await this.documentActivityRepository.createActivity({
      documentId: document.documentId,
      activityType: DocumentActivityType.UPLOAD,
    });

    return document;
  }

  async getDocuments(
    userId: string,
    query: GetDocumentsQueryDto,
  ): Promise<{
    items: Document[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  }> {
    const [items, total] =
      await this.documentRepository.findDocumentsByUserIdWithFilters(
        userId,
        query,
      );
    const page = query.page ?? DOCUMENT_DEFAULT_PAGE;
    const limit = query.limit ?? DOCUMENT_DEFAULT_LIMIT;
    // 목록에서는 문서별 언락 토큰을 받지 않으므로, 잠긴 문서는 항상 민감 필드를 가림
    const redactedItems = items.map((item) =>
      item.isLocked ? this.redactLockedDocument(item) : item,
    );
    return { items: redactedItems, total, page, limit, hasNext: total > page * limit };
  }

  async getDocumentById(
    documentId: string,
    userId: string,
    unlockToken?: string,
  ): Promise<Document> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(
      documentId,
      userId,
      true,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    if (document.isLocked && !this.hasValidUnlockToken(unlockToken, documentId, userId)) {
      return this.redactLockedDocument(document);
    }

    return document;
  }

  /*
    잠긴 문서 열람용 단기 언락 토큰 발급
    - PIN 검증 성공 시에만 발급되며, 해당 문서/유저에만 한정되고 10분 뒤 만료됨
    - 로컬 스토리지 등 영구 저장소에 두지 않고 프론트 메모리에만 보관하는 것을 전제로 함
  */
  async unlockDocument(
    documentId: string,
    userId: string,
    dto: UnlockDocumentDto,
  ): Promise<{ unlockToken: string; expiresIn: number }> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(
      documentId,
      userId,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    await this.usersService.verifyPin(userId, dto.pinNumber);

    const payload: DocumentUnlockPayload = {
      sub: userId,
      documentId,
      purpose: 'document-unlock',
    };
    const unlockToken = this.jwtService.sign(payload, {
      expiresIn: DOCUMENT_UNLOCK_TOKEN_TTL_SECONDS,
    });

    return { unlockToken, expiresIn: DOCUMENT_UNLOCK_TOKEN_TTL_SECONDS };
  }

  private hasValidUnlockToken(
    token: string | undefined,
    documentId: string,
    userId: string,
  ): boolean {
    if (!token) return false;

    try {
      const payload = this.jwtService.verify<DocumentUnlockPayload>(token);
      return (
        payload.purpose === 'document-unlock' &&
        payload.documentId === documentId &&
        payload.sub === userId
      );
    } catch {
      return false;
    }
  }

  private redactLockedDocument(document: Document): Document {
    return {
      ...document,
      ocrText: null,
      extractedData: null,
      aiConfidence: null,
      documentFiles: [],
    };
  }

  async updateDocument(
    documentId: string,
    userId: string,
    dto: UpdateDocumentDto,
  ): Promise<Document> {
    if (dto.categoryId != null) {
      const category = await this.documentCategoryRepository.findById(
        dto.categoryId,
      );
      if (!category) {
        throw new ENotFoundException({
          errorCode: ERROR_CODE.DOCUMENT_CATEGORY_NOT_FOUND,
          message: '존재하지 않는 카테고리입니다.',
        });
      }
    }

    const updated = await this.documentRepository.updateDocumentByUserId(
      documentId,
      userId,
      dto,
    );
    if (!updated) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    await this.documentActivityRepository.createActivity({
      documentId,
      activityType: DocumentActivityType.EDITED,
    });

    return updated;
  }

  async toggleFavorite(
    documentId: string,
    userId: string,
    dto: ToggleFavoriteDto,
  ): Promise<Document> {
    const document = await this.documentRepository.setFavoriteByUserId(
      documentId,
      userId,
      dto.isFavorite,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }
    return document;
  }

  /*
    문서 잠금 설정 변경
    - PIN 검증과 isLocked 업데이트를 한 요청 안에서 원자적으로 처리
    - PIN 검증을 통과하지 못하면 업데이트 로직에 도달하지 않으므로,
      검증을 우회해서 잠금 상태만 바꾸는 것이 불가능함
  */
  async updateLock(
    documentId: string,
    userId: string,
    dto: UpdateDocumentLockDto,
  ): Promise<Document> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(
      documentId,
      userId,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    await this.usersService.verifyPin(userId, dto.pinNumber);

    const updated = await this.documentRepository.setLockByUserId(
      documentId,
      userId,
      dto.isLocked,
    );
    if (!updated) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    return updated;
  }

  async deleteDocument(documentId: string, userId: string): Promise<null> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(
      documentId,
      userId,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    const files = await this.documentFileRepository.findByDocumentId(documentId);

    await this.dataSource.transaction(async (em) => {
      await em.delete(DocumentFile, { documentId });
      await em.delete(DocumentAlert, { documentId });
      await em.delete(DocumentActivity, { documentId });
      await em.delete(DocumentTag, { documentId });
      await em.delete(Document, { documentId });

      // 사용 용량에서 문서 파일 크기만큼 차감 (음수 방지)
      const bytes = Number(document.fileSizeBytes ?? 0);
      if (bytes > 0) {
        await em
          .createQueryBuilder()
          .update(User)
          .set({ storageUsedBytes: () => 'GREATEST(0, storage_used_bytes - :bytes)' })
          .where('user_id = :userId', { userId })
          .setParameter('bytes', bytes)
          .execute();
      }
    });

    for (const file of files) {
      try {
        await this.uploadsService.deleteS3File(file.fileUrl);
      } catch (e) {
        // S3 삭제 실패해도 DB는 이미 정상 삭제됨
      }
    }

    return null;
  }

  async addDocumentTag(
    documentId: string,
    userId: string,
    dto: AddDocumentTagDto,
  ): Promise<DocumentTag> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(
      documentId,
      userId,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    const tag = await this.tagRepository.findOrCreate(userId, dto.name);

    const exists = await this.documentTagRepository.existsByDocumentIdAndTagId(
      documentId,
      tag.tagId,
    );
    if (exists) {
      throw new EConflictException({
        errorCode: ERROR_CODE.DOCUMENT_TAG_ALREADY_EXISTS,
        message: '이미 추가된 태그입니다.',
      });
    }

    const documentTag = await this.documentTagRepository.addTag(
      documentId,
      tag.tagId,
    );

    await this.documentActivityRepository.createActivity({
      documentId,
      activityType: DocumentActivityType.TAG_ADDED,
      description: dto.name,
    });

    return documentTag;
  }

  async removeDocumentTag(
    documentId: string,
    userId: string,
    tagId: string,
  ): Promise<null> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(
      documentId,
      userId,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    const removed = await this.documentTagRepository.removeTag(
      documentId,
      tagId,
    );
    if (!removed) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_TAG_NOT_FOUND,
        message: '해당 문서에 연결된 태그를 찾을 수 없습니다.',
      });
    }

    return null;
  }

  // ── 알림 설정 ────────────────────────────────────────────────

  async createAlert(
    documentId: string,
    userId: string,
    dto: CreateAlertRequestDto,
  ): Promise<DocumentAlert> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(
      documentId,
      userId,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    const duplicate =
      await this.documentAlertRepository.findByDocumentIdAndOffsetType(
        documentId,
        dto.offsetType,
      );
    if (duplicate) {
      throw new EConflictException({
        errorCode: ERROR_CODE.DOCUMENT_ALERT_OFFSET_DUPLICATE,
        message: '이미 설정된 알림 시점입니다.',
      });
    }

    const alert = await this.documentAlertRepository.createAlert({
      documentId,
      userId,
      ...dto,
    });

    await this.documentActivityRepository.createActivity({
      documentId,
      activityType: DocumentActivityType.NOTI_SET,
      description: dto.offsetType,
    });

    // notifyDate가 오늘이거나 이미 지난 경우, 다음날 크론까지 기다리지 않고 즉시 발송
    await this.notificationScheduler.dispatchIfDueNow(alert.alertId);

    return alert;
  }

  async getAlertsByDocument(
    documentId: string,
    userId: string,
  ): Promise<DocumentAlert[]> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(
      documentId,
      userId,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }
    return this.documentAlertRepository.findByDocumentId(documentId);
  }

  async updateAlert(
    documentId: string,
    userId: string,
    alertId: string,
    dto: UpdateAlertRequestDto,
  ): Promise<DocumentAlert> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(
      documentId,
      userId,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    const alert = await this.documentAlertRepository.findByAlertId(alertId);
    if (!alert || alert.documentId !== documentId) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_ALERT_NOT_FOUND,
        message: '존재하지 않는 알림입니다.',
      });
    }

    if (dto.offsetType && dto.offsetType !== alert.offsetType) {
      const duplicate =
        await this.documentAlertRepository.findByDocumentIdAndOffsetType(
          documentId,
          dto.offsetType,
        );
      if (duplicate) {
        throw new EConflictException({
          errorCode: ERROR_CODE.DOCUMENT_ALERT_OFFSET_DUPLICATE,
          message: '이미 설정된 알림 시점입니다.',
        });
      }
    }

    // notifyDate가 바뀌면 예전 날짜 기준으로 이미 발송 완료된 상태(is_sent)를 초기화
    // (안 그러면 새 날짜가 되어도 발송 완료 처리 때문에 다시는 안 나감)
    const isNotifyDateChanged =
      dto.notifyDate !== undefined &&
      new Date(dto.notifyDate).getTime() !== new Date(alert.notifyDate).getTime();

    const updated = await this.documentAlertRepository.updateAlert(
      alertId,
      isNotifyDateChanged ? { ...dto, isSent: false, sentAt: null } : dto,
    );
    if (!updated) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_ALERT_NOT_FOUND,
        message: '알림을 찾을 수 없습니다.',
      });
    }

    // notifyDate가 오늘이거나 이미 지난 경우, 다음날 크론까지 기다리지 않고 즉시 발송
    await this.notificationScheduler.dispatchIfDueNow(alertId);

    return updated;
  }

  async deleteAlert(
    documentId: string,
    userId: string,
    alertId: string,
  ): Promise<null> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(
      documentId,
      userId,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    const alert = await this.documentAlertRepository.findByAlertId(alertId);
    if (!alert || alert.documentId !== documentId) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_ALERT_NOT_FOUND,
        message: '존재하지 않는 알림입니다.',
      });
    }

    await this.documentAlertRepository.deleteAlert(alertId);
    return null;
  }

  async reorderDocumentFiles(
    documentId: string,
    userId: string,
    dto: ReorderDocumentFilesDto,
  ): Promise<{ updated: boolean }> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(
      documentId,
      userId,
    );
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    const pageNos = dto.files.map((f) => f.pageNo);
    const hasDuplicate = pageNos.length !== new Set(pageNos).size;
    if (hasDuplicate) {
      throw new EBadRequestException({
        errorCode: ERROR_CODE.DOCUMENT_FILE_PAGE_DUPLICATE,
        message: '중복된 페이지 번호가 있습니다.',
      });
    }

    const fileIds = dto.files.map((f) => f.fileId);
    const foundFiles = await this.documentFileRepository.findByFileIdsAndDocumentId(
      fileIds,
      documentId,
    );
    if (foundFiles.length !== fileIds.length) {
      const foundIds = new Set(foundFiles.map((f) => f.fileId));
      const missingId = fileIds.find((id) => !foundIds.has(id));
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_FILE_NOT_FOUND,
        message: `존재하지 않는 파일입니다. (fileId: ${missingId})`,
      });
    }

    const allFiles =
      await this.documentFileRepository.findByDocumentId(documentId);
    const reorderingFileIds = new Set(dto.files.map((f) => f.fileId));
    const newPageNos = new Set(dto.files.map((f) => f.pageNo));

    for (const existing of allFiles) {
      if (
        !reorderingFileIds.has(existing.fileId) &&
        newPageNos.has(existing.pageNo)
      ) {
        throw new EConflictException({
          errorCode: ERROR_CODE.DOCUMENT_FILE_PAGE_DUPLICATE,
          message: `pageNo ${existing.pageNo}는 이미 다른 파일이 사용 중입니다.`,
        });
      }
    }

    await this.dataSource.transaction(async (em) => {
      for (const item of dto.files) {
        const result = await em.update(
          DocumentFile,
          { fileId: item.fileId, documentId },
          { pageNo: item.pageNo },
        );
        if ((result.affected ?? 0) === 0) {
          throw new ENotFoundException({
            errorCode: ERROR_CODE.DOCUMENT_FILE_NOT_FOUND,
            message: `파일을 찾을 수 없습니다. (fileId: ${item.fileId})`,
          });
        }
      }
    });

    return { updated: true };
  }

  async getDocumentAiStatus(
    documentId: string,
    userId: string,
  ): Promise<{ documentId: string; aiStatus: AiStatus }> {
    const result = await this.documentRepository.findAiStatusByDocumentId(
      documentId,
      userId,
    );
    if (!result) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }
    return result;
  }

  async generatePdf(
    documentId: string,
    userId: string,
    unlockToken?: string,
  ): Promise<Buffer> {
    const document = await this.documentRepository.findByDocumentIdAndUserId(documentId, userId, true);
    if (!document) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '존재하지 않는 문서입니다.',
      });
    }

    if (document.isLocked && !this.hasValidUnlockToken(unlockToken, documentId, userId)) {
      throw new EUnauthorizedException({
        errorCode: ERROR_CODE.DOCUMENT_LOCKED,
        message: '문서 잠금을 먼저 해제해주세요.',
      });
    }

    const files = (document.documentFiles ?? []).sort((a, b) => a.pageNo - b.pageNo);
    if (files.length === 0) {
      throw new ENotFoundException({
        errorCode: ERROR_CODE.DOCUMENT_NOT_FOUND,
        message: '다운로드할 파일이 없습니다.',
      });
    }

    const pdfDoc = await PDFDocument.create();

    for (const file of files) {
      const response = await axios.get<ArrayBuffer>(file.fileUrl, { responseType: 'arraybuffer' });
      const imageBytes = new Uint8Array(response.data);

      const isJpeg = file.fileUrl.toLowerCase().endsWith('.jpg') || file.fileUrl.toLowerCase().endsWith('.jpeg');
      const image = isJpeg
        ? await pdfDoc.embedJpg(imageBytes)
        : await pdfDoc.embedPng(imageBytes);

      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}
