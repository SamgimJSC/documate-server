import { Inject, Injectable } from '@nestjs/common';

import { TypeOrmReceiptRepository } from './model/receipt.repository';
import { type ReceiptRepository } from './model/receipt.interface';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { ERROR_CODE } from '../global/constants/errorCode.const';

@Injectable()
export class ReceiptsService {
  constructor(
    @Inject(TypeOrmReceiptRepository)
    private readonly receiptRepo: ReceiptRepository,
  ) {}

  /*
    영수증 상세 조회
    - 본인 영수증만 조회 가능
    - 본인 게 아니면 일부러 NOT_FOUND로 응답 (남의 영수증 존재 여부 추측 방지)
    - 카테고리명/아이콘은 평탄화해서 응답에 포함
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
    Receipt 엔티티를 응답 DTO 형태로 변환
    - spendCategory 관계 객체를 categoryName/icon으로 평탄화
    - 내부용 관계 객체(spendCategory, user)는 응답에서 제거
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