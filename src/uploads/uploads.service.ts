import { Inject, Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import Redis from 'ioredis';
import { TypedConfigService } from '../configs/typedConfig.service';
import { AiStatus } from '../global/constants/aiStatus.enum';
import { OCR_QUEUE_KEY } from '../redis/redis.const';
import { UploadTarget } from '../global/constants/uploadTarget.enum';
import { buildUploadKey } from './utils/buildUploadKey';
import { UploadedFileResult } from './types/uploadedFileResult.type';
import {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MIME_TO_FILE_TYPE,
  IMAGE_ONLY_MIME_TYPES,
  IMAGE_ONLY_EXTENSIONS,
  MAX_TEMP_FILES_PER_DOCUMENT,
} from './const/upload.const';
import { TypeOrmTempDocumentRepository } from './model/temp-document.repository';
import { TypeOrmTempFileRepository } from './model/temp-file.repository';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { EForbiddenException } from '../global/exceptions/EForbiddenException';
import { EBadRequestException } from '../global/exceptions/EBadRequestException';
import { EConflictException } from '../global/exceptions/EConflictException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { RequestAiAnalyseDto } from './dto/requestAiAnalyse.dto';
import { ReorderTempFilesDto } from './dto/reorderTempFiles.dto';
import { UsersService } from '../users/users.service';

export interface TempFileItem {
  id: string;
  fileUrl: string;
  pageNo: number;
}

export interface TempUploadResponse {
  tempDocumentId: string;
  files: TempFileItem[];
}

export interface TempDocumentListItem {
  tempDocumentId: string;
  aiStatus: AiStatus;
  createdAt: Date;
  files: TempFileItem[];
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cloudfrontUrl: string | undefined;

  constructor(
    private readonly configService: TypedConfigService,
    private readonly tempDocumentRepo: TypeOrmTempDocumentRepository,
    private readonly tempFileRepo: TypeOrmTempFileRepository,
    private readonly usersService: UsersService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    this.region = this.configService.get('AWS_REGION');
    this.bucket = this.configService.get('AWS_S3_BUCKET_NAME');
    this.cloudfrontUrl = this.configService.get('AWS_CLOUDFRONT_URL');

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
    targetType: UploadTarget,
  ): Promise<UploadedFileResult> {
    if (!file) {
      throw new EBadRequestException({
        message: '파일이 없습니다.',
        errorCode: ERROR_CODE.FILE_MISSING,
      });
    }

    if (
      !ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new EBadRequestException({
        message: '허용되지 않는 파일 형식입니다.',
        errorCode: ERROR_CODE.INVALID_FILE_TYPE,
      });
    }

    const dotIndex = file.originalname.lastIndexOf('.');
    const ext =
      dotIndex !== -1 ? file.originalname.slice(dotIndex).toLowerCase() : '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new EBadRequestException({
        message: '허용되지 않는 파일 확장자입니다.',
        errorCode: ERROR_CODE.INVALID_FILE_EXTENSION,
      });
    }

    const fileKey = buildUploadKey(userId, targetType, file.originalname);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const fileUrl = this.buildFileUrl(fileKey);

    await this.addUserStorageUsage(userId, file.size);

    return {
      fileUrl,
      fileKey,
      fileName: file.originalname,
      fileType: MIME_TO_FILE_TYPE[file.mimetype],
      fileSizeBytes: String(file.size),
      mimeType: file.mimetype,
      targetType,
    };
  }

  async startUpload(userId: string): Promise<{ tempDocumentId: string }> {
    const tempDoc = await this.tempDocumentRepo.insert(userId);
    return { tempDocumentId: tempDoc.tempDocumentId };
  }

  async uploadTempFile(
    userId: string,
    tempDocumentId: string,
    pageNo: number,
    file: Express.Multer.File,
  ): Promise<TempUploadResponse> {
    if (!file) {
      throw new EBadRequestException({
        message: '파일이 없습니다.',
        errorCode: ERROR_CODE.FILE_MISSING,
      });
    }

    if (
      !IMAGE_ONLY_MIME_TYPES.includes(
        file.mimetype as (typeof IMAGE_ONLY_MIME_TYPES)[number],
      )
    ) {
      throw new EBadRequestException({
        message: 'JPG, PNG 이미지만 업로드할 수 있습니다.',
        errorCode: ERROR_CODE.INVALID_FILE_TYPE,
      });
    }

    const dotIndex = file.originalname.lastIndexOf('.');
    const ext =
      dotIndex !== -1 ? file.originalname.slice(dotIndex).toLowerCase() : '';
    if (!IMAGE_ONLY_EXTENSIONS.has(ext)) {
      throw new EBadRequestException({
        message: 'JPG, PNG 이미지만 업로드할 수 있습니다.',
        errorCode: ERROR_CODE.INVALID_FILE_EXTENSION,
      });
    }

    const tempDoc = await this.tempDocumentRepo.findById(tempDocumentId);
    if (!tempDoc) {
      throw new ENotFoundException({
        message: '임시 문서를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.TEMP_DOCUMENT_NOT_FOUND,
      });
    }
    if (tempDoc.userId !== userId) {
      throw new EForbiddenException({
        message: '접근 권한이 없습니다.',
        errorCode: ERROR_CODE.TEMP_DOCUMENT_NOT_OWNER,
      });
    }

    const currentCount =
      await this.tempFileRepo.countByTempDocumentId(tempDocumentId);
    if (currentCount >= MAX_TEMP_FILES_PER_DOCUMENT) {
      throw new EBadRequestException({
        message: `문서당 최대 ${MAX_TEMP_FILES_PER_DOCUMENT}장까지 업로드할 수 있습니다.`,
        errorCode: ERROR_CODE.TEMP_FILE_LIMIT_EXCEEDED,
      });
    }

    const isDuplicate = await this.tempFileRepo.existsByTempDocumentIdAndPageNo(
      tempDocumentId,
      pageNo,
    );
    if (isDuplicate) {
      throw new EBadRequestException({
        message: `이미 업로드된 페이지 번호입니다. (pageNo: ${pageNo})`,
        errorCode: ERROR_CODE.TEMP_FILE_PAGE_DUPLICATE,
      });
    }

    const fileKey = buildUploadKey(
      userId,
      UploadTarget.TEMP,
      file.originalname,
    );
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const fileUrl = this.buildFileUrl(fileKey);
    try {
      await this.tempFileRepo.insert({ tempDocumentId, fileUrl, pageNo });
    } catch (e) {
      if (e instanceof Error && 'code' in e && e.code === '23505') {
        throw new EConflictException({
          errorCode: ERROR_CODE.TEMP_FILE_PAGE_DUPLICATE,
          message: `이미 업로드된 페이지 번호입니다. (pageNo: ${pageNo})`,
        });
      }
      throw e;
    }

    await this.addUserStorageUsage(userId, file.size);

    const allFiles =
      await this.tempFileRepo.findByTempDocumentId(tempDocumentId);

    return {
      tempDocumentId,
      files: allFiles.map((f) => ({
        id: f.id,
        fileUrl: f.fileUrl,
        pageNo: f.pageNo,
      })),
    };
  }

  async getTempDocumentList(userId: string): Promise<TempDocumentListItem[]> {
    const tempDocs = await this.tempDocumentRepo.findByUserId(userId);

    return tempDocs.map((doc) => ({
      tempDocumentId: doc.tempDocumentId,
      aiStatus: doc.aiStatus,
      createdAt: doc.createdAt,
      files: (doc.tempFiles ?? []).map((f) => ({
        id: f.id,
        fileUrl: f.fileUrl,
        pageNo: f.pageNo,
      })),
    }));
  }

  async reorderTempFiles(
    userId: string,
    tempDocumentId: string,
    dto: ReorderTempFilesDto,
  ): Promise<TempUploadResponse> {
    const tempDoc = await this.tempDocumentRepo.findById(tempDocumentId);
    if (!tempDoc) {
      throw new ENotFoundException({
        message: '임시 문서를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.TEMP_DOCUMENT_NOT_FOUND,
      });
    }
    if (tempDoc.userId !== userId) {
      throw new EForbiddenException({
        message: '접근 권한이 없습니다.',
        errorCode: ERROR_CODE.TEMP_DOCUMENT_NOT_OWNER,
      });
    }

    const existingFiles =
      await this.tempFileRepo.findByTempDocumentId(tempDocumentId);
    const orderedFileIds = dto.files.map((f) => f.id);
    const existingIds = new Set(existingFiles.map((f) => f.id));
    const isSameSet =
      orderedFileIds.length === existingIds.size &&
      new Set(orderedFileIds).size === orderedFileIds.length &&
      orderedFileIds.every((id) => existingIds.has(id));
    if (!isSameSet) {
      throw new EBadRequestException({
        message: '파일 목록이 일치하지 않습니다.',
        errorCode: ERROR_CODE.TEMP_FILE_ORDER_MISMATCH,
      });
    }

    await this.tempFileRepo.setPageOrders(tempDocumentId, dto.files);

    const allFiles =
      await this.tempFileRepo.findByTempDocumentId(tempDocumentId);
    return {
      tempDocumentId,
      files: allFiles.map((f) => ({
        id: f.id,
        fileUrl: f.fileUrl,
        pageNo: f.pageNo,
      })),
    };
  }

  async requestAi(
    userId: string,
    tempDocumentId: string,
    dto: RequestAiAnalyseDto,
  ): Promise<{ tempDocumentId: string; aiStatus: AiStatus }> {
    const tempDoc = await this.tempDocumentRepo.findById(tempDocumentId);
    if (!tempDoc) {
      throw new ENotFoundException({
        message: '임시 문서를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.TEMP_DOCUMENT_NOT_FOUND,
      });
    }
    if (tempDoc.userId !== userId) {
      throw new EForbiddenException({
        message: '접근 권한이 없습니다.',
        errorCode: ERROR_CODE.TEMP_DOCUMENT_NOT_OWNER,
      });
    }

    if (tempDoc.aiStatus === AiStatus.PROCESSING) {
      throw new EConflictException({
        message: '이미 AI 분석이 진행 중입니다.',
        errorCode: ERROR_CODE.TEMP_DOCUMENT_AI_IN_PROGRESS,
      });
    }

    const existingFiles =
      await this.tempFileRepo.findByTempDocumentId(tempDocumentId);
    if (existingFiles.length === 0) {
      throw new EBadRequestException({
        message: '분석할 파일이 없습니다.',
        errorCode: ERROR_CODE.TEMP_DOCUMENT_NO_FILES,
      });
    }

    const orderedFileIds = dto.files.map((f) => f.id);
    const existingIds = new Set(existingFiles.map((f) => f.id));
    const isSameSet =
      orderedFileIds.length === existingIds.size &&
      new Set(orderedFileIds).size === orderedFileIds.length &&
      orderedFileIds.every((id) => existingIds.has(id));
    if (!isSameSet) {
      throw new EBadRequestException({
        message: '페이지 순서 정보가 문서의 파일과 일치하지 않습니다.',
        errorCode: ERROR_CODE.TEMP_FILE_ORDER_MISMATCH,
      });
    }

    await this.tempFileRepo.setPageOrders(tempDocumentId, dto.files);

    await this.tempDocumentRepo.updateAiStatus(
      tempDocumentId,
      AiStatus.PENDING,
    );

    // OCR 워커가 BLPOP 으로 소비하므로 RPUSH 로 큐 뒤쪽에 적재(FIFO).
    await this.redis.rpush(OCR_QUEUE_KEY, JSON.stringify({ tempDocumentId }));

    return { tempDocumentId, aiStatus: AiStatus.PENDING };
  }

  /**
   * 신규 업로드한 파일 용량만큼 users.storage_used_bytes 를 증분 갱신한다.
   * 기존 값이 정확하다는 전제하에 DB 레벨 원자적 증가(+=)로 처리해 동시 업로드 경합을 피한다.
   * 업로드 자체는 이미 완료된 상태이므로, 갱신 실패가 응답을 막지 않도록 예외는 로깅만 한다.
   */
  private async addUserStorageUsage(
    userId: string,
    bytes: number,
  ): Promise<void> {
    try {
      await this.usersService.addStorageUsedBytes(userId, bytes);
    } catch (e) {
      this.logger.error(
        `storage_used_bytes 갱신 실패 (userId=${userId})`,
        e instanceof Error ? e.stack : String(e),
      );
    }
  }

  private buildFileUrl(fileKey: string): string {
    const encoded = encodeURI(fileKey);

    if (this.cloudfrontUrl) {
      return `${this.cloudfrontUrl}/${encoded}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encoded}`;
  }
}
