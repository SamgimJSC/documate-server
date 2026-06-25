import { Inject, Injectable } from '@nestjs/common';

import { TypeOrmReceiptRepository } from './model/receipt.repository';
import { type ReceiptRepository } from './model/receipt.interface';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import { CreateReceiptRequestDto } from './dto/createReceiptRequest.dto';
import { GetReceiptsQueryDto } from './dto/getReceiptsQuery.dto';
import { UpdateReceiptRequestDto } from './dto/updateReceiptRequest.dto';
import { Receipt } from './entities/receipt.entity';
import { AiStatus } from '../global/constants/aiStatus.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReceiptsService {
  constructor(
    @Inject(TypeOrmReceiptRepository)
    private readonly receiptRepo: ReceiptRepository,
    private readonly usersService: UsersService,
  ) {}

  /*
    영수증 생성 (언니 작업분)
    - userId는 JWT에서 추출, isConfirmed 기본값 true
    - 향후 OCR 비동기 처리 시 aiStatus는 PROCESSING으로 바뀔 수 있음
  */
  async createReceipt(
    userId: string,
    dto: CreateReceiptRequestDto,
  ): Promise<Receipt> {
    return this.receiptRepo.createReceipt({
      ...dto,
      userId,
      fileSizeBytes: String(dto.fileSizeBytes ?? 0),
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
  */
  async updateReceipt(
    userId: string,
    receiptId: string,
    dto: UpdateReceiptRequestDto,
  ) {
    await this.getOwnedReceipt(userId, receiptId);

    const updatePayload: Record<string, any> = { ...dto };
    if (dto.purchaseDate) {
      updatePayload.purchaseDate = new Date(dto.purchaseDate);
    }

    await this.receiptRepo.updateReceipt(receiptId, updatePayload);

    const updated =
      await this.receiptRepo.findByReceiptIdWithCategory(receiptId);
    return this.toReceiptDetailResponse(updated);
  }

  /*
    영수증 삭제 (소프트 삭제)
    - 본인 영수증만 삭제 가능
  */
  async removeReceipt(userId: string, receiptId: string): Promise<void> {
    const receipt = await this.getOwnedReceipt(userId, receiptId);

    await this.receiptRepo.softDeleteReceipt(receiptId);

    // 사용 용량에서 영수증 파일 크기만큼 차감 (음수 방지는 repository 에서 처리)
    const bytes = Number(receipt.fileSizeBytes ?? 0);
    if (bytes > 0) {
      await this.usersService.subtractStorageUsedBytes(userId, bytes);
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