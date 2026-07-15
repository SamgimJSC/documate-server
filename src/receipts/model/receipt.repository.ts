import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Receipt } from '../entities/receipt.entity';
import {
  FindReceiptsFilter,
  FindReceiptsResult,
  ReceiptRepository,
} from './receipt.interface';
import { CreateReceiptDto } from '../dto/createReceipt.dto';
import { UpdateReceiptDto } from '../dto/updateReceipt.dto';
import { ReceiptSortType } from '../dto/getReceiptsQuery.dto';

@Injectable()
export class TypeOrmReceiptRepository implements ReceiptRepository {
  constructor(
    @InjectRepository(Receipt)
    private readonly repo: Repository<Receipt>,
  ) {}

  async createReceipt(dto: CreateReceiptDto): Promise<Receipt> {
    const receipt = this.repo.create(dto);
    return this.repo.save(receipt);
  }

  async findByReceiptId(receiptId: string): Promise<Receipt | null> {
    return this.repo.findOne({ where: { receiptId, isDeleted: false } });
  }

  async findByUserId(userId: string): Promise<Receipt[]> {
    return this.repo.find({ where: { userId, isDeleted: false } });
  }

  // 유저에게 (미삭제) 영수증이 1건이라도 있는지 확인 (카드 추천 진입 분기용)
  async existsByUserId(userId: string): Promise<boolean> {
    return this.repo.existsBy({ userId, isDeleted: false });
  }

  async updateReceipt(
    receiptId: string,
    dto: UpdateReceiptDto,
  ): Promise<Receipt | null> {
    const receipt = await this.findByReceiptId(receiptId);
    if (!receipt) return null;

    Object.assign(receipt, dto);
    return this.repo.save(receipt);
  }

  /*
    상세 조회 — 영수증과 함께 카테고리 정보(spendCategory)까지 같이 가져옴.
    JOIN을 통해 categoryName/icon을 평탄화하기 위해 사용.
  */
  async findByReceiptIdWithCategory(
    receiptId: string,
  ): Promise<Receipt | null> {
    return this.repo.findOne({
      where: { receiptId, isDeleted: false },
      relations: { spendCategory: true },
    });
  }

  /*
    영수증 목록 조회 (검색/필터/정렬/페이지네이션)

    QueryBuilder로 동적 쿼리 생성:
    - 본인 영수증 + 미삭제는 필수 조건
    - 나머지 필터(날짜/카테고리/키워드)는 파라미터 있을 때만 적용
    - 페이지네이션과 함께 전체 개수도 같이 반환
  */
  async findList(filter: FindReceiptsFilter): Promise<FindReceiptsResult> {
    const {
      userId,
      year,
      month,
      date,
      fromDate,
      toDate,
      categoryId,
      keyword,
      sort,
      page,
      size,
    } = filter;

    // 기본 쿼리: 본인 영수증 + 미삭제 + 카테고리 조인
    const qb = this.repo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.spendCategory', 'c')
      .where('r.userId = :userId', { userId })
      .andWhere('r.isDeleted = false');

    // ===== 날짜 필터 (우선순위: date > year/month > fromDate/toDate) =====
    if (date) {
      qb.andWhere('r.purchase_date = :date', { date });
    } else if (year !== undefined) {
      qb.andWhere('EXTRACT(YEAR FROM r.purchase_date) = :year', { year });
      if (month !== undefined) {
        qb.andWhere('EXTRACT(MONTH FROM r.purchase_date) = :month', { month });
      }
    } else {
      if (fromDate) {
        qb.andWhere('r.purchase_date >= :fromDate', { fromDate });
      }
      if (toDate) {
        qb.andWhere('r.purchase_date <= :toDate', { toDate });
      }
    }

    // ===== 카테고리 필터 =====
    if (categoryId !== undefined) {
      qb.andWhere('r.spendCategoryId = :categoryId', { categoryId });
    }

    // ===== 키워드 검색 (가맹점/품목/메모 OR로 검색) =====
    if (keyword) {
      qb.andWhere(
        '(r.storeName ILIKE :kw OR r.paymentItem ILIKE :kw OR r.memo ILIKE :kw)',
        { kw: `%${keyword}%` },
      );
    }

    // ===== 정렬 =====
    this.applySort(qb, sort);

    // ===== 페이지네이션 =====
    qb.skip((page - 1) * size).take(size);

    // getManyAndCount() — 결과 + 전체 개수 한 번에 반환
    const [rows, totalCount] = await qb.getManyAndCount();

    return { rows, totalCount };
  }

  /*
    [내부 헬퍼] 정렬 옵션을 QueryBuilder에 적용
    - sort 안 들어오면 기본값: 최신 등록순
  */
  private applySort(
    qb: ReturnType<TypeOrmReceiptRepository['repo']['createQueryBuilder']>,
    sort?: ReceiptSortType,
  ): void {
    switch (sort) {
      case ReceiptSortType.PURCHASE_DATE:
        qb.orderBy('r.purchase_date', 'DESC');
        break;
      case ReceiptSortType.AMOUNT_DESC:
        qb.orderBy('r.total_amount', 'DESC');
        break;
      case ReceiptSortType.AMOUNT_ASC:
        qb.orderBy('r.total_amount', 'ASC');
        break;
      case ReceiptSortType.LATEST:
      default:
        qb.orderBy('r.created_at', 'DESC');
        break;
    }
  }
}