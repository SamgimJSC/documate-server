import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { TypeOrmReceiptRepository } from './model/receipt.repository';
import { type ReceiptRepository } from './model/receipt.interface';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { CreateReceiptRequestDto } from './dto/createReceiptRequest.dto';
import { GetReceiptsQueryDto } from './dto/getReceiptsQuery.dto';
import { UpdateReceiptRequestDto } from './dto/updateReceiptRequest.dto';
import { Receipt } from './entities/receipt.entity';
import { ReceiptTag } from './entities/receipt-tag.entity';
import { AiStatus } from '../global/constants/aiStatus.enum';
import { UsersService } from '../users/users.service';
import { UploadsService } from '../uploads/uploads.service';
import { UploadTarget } from '../global/constants/uploadTarget.enum';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(TypeOrmReceiptRepository)
    private readonly receiptRepo: ReceiptRepository,
    private readonly usersService: UsersService,
    private readonly uploadsService: UploadsService,
  ) {}

  /*
    영수증 생성 (언니 작업분)
    - userId는 JWT에서 추출, isConfirmed 기본값 true
    - 향후 OCR 비동기 처리 시 aiStatus는 PROCESSING으로 바뀔 수 있음
  */
  async createReceipt(
    userId: string,
    dto: CreateReceiptRequestDto,
    image?: Express.Multer.File,
  ): Promise<Receipt> {
    let fileUrl = dto.fileUrl;
    let fileSizeBytes = dto.fileSizeBytes ?? 0;

    if (image) {
      const uploaded = await this.uploadsService.uploadFile(
        userId,
        image,
        UploadTarget.RECEIPT,
      );
      fileUrl = uploaded.fileUrl;
      fileSizeBytes = Number(uploaded.fileSizeBytes);
    }

    return this.receiptRepo.createReceipt({
      ...dto,
      userId,
      fileUrl,
      fileSizeBytes: String(fileSizeBytes),
      purchaseDate: new Date(dto.purchaseDate),
      aiStatus: AiStatus.DONE,
      isConfirmed: dto.isConfirmed ?? true,
    });
  }

  /*
    영수증 목록 조회 (검색/필터/정렬/페이지네이션)
  */
  async getReceipts(userId: string, query: GetReceiptsQueryDto) {
    const page = query.page ?? 1;
    const size = query.size ?? 10;

    const { rows, totalCount } = await this.receiptRepo.findList({
      userId,
      year: query.year,
      month: query.month,
      date: query.date,
      fromDate: query.fromDate,
      toDate: query.toDate,
      categoryId: query.categoryId,
      keyword: query.keyword,
      sort: query.sort,
      page,
      size,
    });

    const receipts = rows.map((r) => this.toReceiptListItem(r));
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / size);

    return {
      page,
      size,
      totalCount,
      totalPages,
      receipts,
    };
  }

  /*
    영수증 상세 조회
    - 본인 영수증만 조회 가능
  */
  async getReceiptDetail(userId: string, receiptId: string) {
    const receipt =
      await this.receiptRepo.findByReceiptIdWithCategory(receiptId);

    if (!receipt || receipt.userId !== userId) {
      throw new ENotFoundException({
        message: '영수증을 찾을 수 없습니다.',
        errorCode: ERROR_CODE.RECEIPT_NOT_FOUND,
      });
    }

    return this.toReceiptDetailResponse(receipt);
  }

  /*
    영수증 수정 (PATCH)
    - 본인 영수증만 수정 가능
    - 시스템 관리 필드(ocrText, aiStatus 등)는 외부에서 변경 불가
    - image가 전달되면 새 사진으로 업로드/교체 (기존 사진이 있었다면 DB 갱신 후 S3에서 삭제)
  */
  async updateReceipt(
    userId: string,
    receiptId: string,
    dto: UpdateReceiptRequestDto,
    image?: Express.Multer.File,
  ) {
    const receipt = await this.getOwnedReceipt(userId, receiptId);

    const updatePayload: Record<string, any> = { ...dto };
    if (dto.purchaseDate) {
      updatePayload.purchaseDate = new Date(dto.purchaseDate);
    }

    const previousFileUrl = receipt.fileUrl;
    const previousFileSizeBytes = Number(receipt.fileSizeBytes ?? 0);

    if (image) {
      const uploaded = await this.uploadsService.uploadFile(
        userId,
        image,
        UploadTarget.RECEIPT,
      );
      updatePayload.fileUrl = uploaded.fileUrl;
      updatePayload.fileSizeBytes = String(uploaded.fileSizeBytes);
    }

    await this.receiptRepo.updateReceipt(receiptId, updatePayload);

    // DB가 새 fileUrl로 갱신된 뒤에 기존 사진 정리 (목록에서 깨진 이미지로 보이는 것 방지)
    if (image && previousFileUrl) {
      if (previousFileSizeBytes > 0) {
        await this.usersService.subtractStorageUsedBytes(
          userId,
          previousFileSizeBytes,
        );
      }
      try {
        await this.uploadsService.deleteS3File(previousFileUrl);
      } catch (e) {
        this.logger.error(
          `receipt 기존 이미지 S3 삭제 실패 (receiptId=${receiptId}, fileUrl=${previousFileUrl})`,
          e instanceof Error ? e.stack : String(e),
        );
      }
    }

    const updated =
      await this.receiptRepo.findByReceiptIdWithCategory(receiptId);
    return this.toReceiptDetailResponse(updated);
  }

  /*
    영수증 삭제 (하드 삭제 + S3 파일 삭제)
    - 본인 영수증만 삭제 가능
    - documents.deleteDocument() 와 동일한 순서: DB 트랜잭션 커밋 후 S3 삭제
      (S3를 먼저 지우면 트랜잭션 커밋 전까지 목록엔 남아있는데 이미지가 깨져 보이는 문제가 있어 이 순서로 함)
  */
  async removeReceipt(userId: string, receiptId: string): Promise<void> {
    const receipt = await this.getOwnedReceipt(userId, receiptId);

    await this.dataSource.transaction(async (em) => {
      await em.delete(ReceiptTag, { receiptId });
      await em.delete(Receipt, { receiptId });
    });

    // 사용 용량에서 영수증 파일 크기만큼 차감 (음수 방지는 usersService 에서 처리)
    const bytes = Number(receipt.fileSizeBytes ?? 0);
    if (bytes > 0) {
      await this.usersService.subtractStorageUsedBytes(userId, bytes);
    }

    if (receipt.fileUrl) {
      try {
        await this.uploadsService.deleteS3File(receipt.fileUrl);
      } catch (e) {
        // S3 삭제 실패해도 DB는 이미 정상 삭제됨
        this.logger.error(
          `receipt S3 삭제 실패 (receiptId=${receiptId}, fileUrl=${receipt.fileUrl})`,
          e instanceof Error ? e.stack : String(e),
        );
      }
    }
  }

  /*
    [내부 헬퍼] 영수증이 존재하고 본인 소유인지 검증
  */
  private async getOwnedReceipt(userId: string, receiptId: string) {
    const receipt = await this.receiptRepo.findByReceiptId(receiptId);

    if (!receipt || receipt.userId !== userId) {
      throw new ENotFoundException({
        message: '영수증을 찾을 수 없습니다.',
        errorCode: ERROR_CODE.RECEIPT_NOT_FOUND,
      });
    }

    return receipt;
  }

  /*
    [내부 헬퍼] 목록 응답용 변환
    - 목록은 ocrText, extractedData 같은 무거운 필드는 제외
  */
  private toReceiptListItem(receipt: any) {
    const { spendCategory, user, ocrText, extractedData, ...rest } = receipt;

    return {
      ...rest,
      categoryName: spendCategory?.name ?? null,
      icon: spendCategory?.icon ?? null,
    };
  }

  /*
    [내부 헬퍼] 상세 응답용 변환 - 모든 필드 포함
  */
  private toReceiptDetailResponse(receipt: any) {
    const { spendCategory, user, ...rest } = receipt;

    return {
      ...rest,
      categoryName: spendCategory?.name ?? null,
      icon: spendCategory?.icon ?? null,
    };
  }
}