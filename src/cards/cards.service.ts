import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';

import { CARD_QUEUE_KEY } from '../redis/redis.const';
import { TypeOrmCardRepository } from '../admin/model/card.repository';
import { TypeOrmCardRecommendationRepository } from '../admin/model/card-recommendation.repository';
import { TypeOrmReceiptRepository } from '../receipts/model/receipt.repository';
import { Card } from '../admin/entities/card.entity';
import { CardRecommendation } from '../admin/entities/card-recommendation.entity';
import { DEFAULT_CARD_NAMES } from './const/cards.const';
import { ENotFoundException } from '../global/exceptions/ENotFoundException';
import { ERROR_CODE } from '../global/constants/errorCode.const';

/*
  카드 추천 API 서비스
  - 클라이언트 요청은 모두 이 API 서버가 담당한다.
  - 실제 추천 분석은 card-server(파이썬) 워커가 card:queue 를 소비해 수행하고,
    결과를 card_recommendations 에 저장한다. 이 서비스는 그 결과를 조회/트리거만 한다.
*/
@Injectable()
export class CardsService {
  constructor(
    private readonly cardRepo: TypeOrmCardRepository,
    private readonly cardRecoRepo: TypeOrmCardRecommendationRepository,
    private readonly receiptRepo: TypeOrmReceiptRepository,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  // GET /cards/recommendation — 기존 추천 카드 목록 (없으면 빈 배열)
  async getRecommendations(userId: string) {
    const recommendations = await this.cardRecoRepo.findByUserId(userId);
    return {
      recommendations: recommendations.map((r) => this.toRecommendationJson(r)),
    };
  }

  // GET /cards/check — receipt 유무. 없으면 기본 카드 3종 반환
  async check(userId: string) {
    const hasReceipt = await this.receiptRepo.existsByUserId(userId);
    if (hasReceipt) {
      return { hasReceipt: true, defaultCards: [] };
    }

    const cards = await this.cardRepo.findByNames(DEFAULT_CARD_NAMES);
    // DEFAULT_CARD_NAMES 순서를 유지해서 반환
    const byName = new Map(cards.map((c) => [c.cardName, c]));
    const ordered = DEFAULT_CARD_NAMES.map((n) => byName.get(n)).filter(
      (c): c is Card => Boolean(c),
    );
    return {
      hasReceipt: false,
      defaultCards: ordered.map((c) => this.toCardJson(c)),
    };
  }

  // GET /cards/ai — AI 추천 작업을 card:queue 에 넣는다 (파이썬 워커가 BLPOP)
  async requestAi(userId: string) {
    const hasReceipt = await this.receiptRepo.existsByUserId(userId);
    if (!hasReceipt) {
      throw new ENotFoundException({
        message: '분석할 영수증이 없습니다.',
        errorCode: ERROR_CODE.RECEIPT_NOT_FOUND,
      });
    }

    await this.redis.rpush(CARD_QUEUE_KEY, JSON.stringify({ userId }));
    return { status: 'queued', queue: CARD_QUEUE_KEY };
  }

  // GET /cards/:cardId — 상세보기용 카드 단건 조회 (benefits 포함)
  async getCardDetail(cardId: string) {
    const card = await this.cardRepo.findByCardId(cardId);
    if (!card) {
      throw new ENotFoundException({
        message: '카드를 찾을 수 없습니다.',
        errorCode: ERROR_CODE.CARD_NOT_FOUND,
      });
    }
    return this.toCardDetailJson(card);
  }

  private toCardJson(card: Card) {
    return {
      cardId: card.cardId,
      cardName: card.cardName,
      issuer: card.issuer,
      annualFee: this.toNumber(card.annualFee),
      imgUrl: card.imgUrl,
    };
  }

  private toCardDetailJson(card: Card) {
    return {
      cardId: card.cardId,
      cardName: card.cardName,
      issuer: card.issuer,
      annualFee: this.toNumber(card.annualFee),
      imgUrl: card.imgUrl,
      sourceUrl: card.sourceUrl,
      benefits: card.benefits,
    };
  }

  private toRecommendationJson(r: CardRecommendation) {
    return {
      recommendationId: r.recommendationId,
      cardId: r.cardId,
      cardName: r.card?.cardName ?? null,
      issuer: r.card?.issuer ?? null,
      annualFee: this.toNumber(r.card?.annualFee),
      imgUrl: r.card?.imgUrl ?? null,
      reason: r.reason,
      matchScore: this.toNumber(r.matchScore),
      recommendedAt: r.recommendedAt,
    };
  }

  // numeric 컬럼은 TypeORM 에서 문자열로 올 수 있어 숫자로 변환한다.
  private toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
}
