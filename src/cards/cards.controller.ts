import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { CardsService } from './cards.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { DecoUser } from '../global/decorators/decoUser.decorator';
import { type ReqUser } from '../global/types/express';

/*
  카드 추천 API
  - 모든 엔드포인트 로그인 필수 (JWT 에서 userId 추출)
  - 본인 데이터만 조회/요청 가능
*/
@UseGuards(JwtAuthGuard)
@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  // ====================================================================
  // GET /cards/recommendation
  // 기존에 추천받은 카드 목록 (없으면 빈 배열)
  // ====================================================================
  @Get('recommendation')
  getRecommendation(@DecoUser() user: ReqUser) {
    return this.cardsService.getRecommendations(user.userId);
  }

  // ====================================================================
  // GET /cards/check
  // receipt 유무 확인. 없으면 기본 카드 3종 반환
  // ====================================================================
  @Get('check')
  check(@DecoUser() user: ReqUser) {
    return this.cardsService.check(user.userId);
  }

  // ====================================================================
  // GET /cards/ai
  // AI 카드 추천 작업을 큐(card:queue)에 넣음
  // ====================================================================
  @Get('ai')
  requestAi(@DecoUser() user: ReqUser) {
    return this.cardsService.requestAi(user.userId);
  }

  // ====================================================================
  // GET /cards/:cardId
  // 카드 상세보기 - benefits(상세 혜택) 포함 단건 조회
  // 반드시 위 고정 경로(recommendation/check/ai)들보다 아래에 위치해야 함
  // ====================================================================
  @Get(':cardId')
  getCardDetail(@Param('cardId') cardId: string) {
    return this.cardsService.getCardDetail(cardId);
  }
}
