import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Card } from '../entities/card.entity';
import { CardRepository } from './card.interface';
import { UpsertCardDto } from '../dto/upsertCard.dto';

@Injectable()
export class TypeOrmCardRepository implements CardRepository {
  constructor(
    @InjectRepository(Card)
    private readonly repo: Repository<Card>,
  ) {}

  async createCard(dto: UpsertCardDto): Promise<Card> {
    const card = this.repo.create(dto);
    return this.repo.save(card);
  }

  async findAll(): Promise<Card[]> {
    return this.repo.find();
  }

  async findByCardId(cardId: string): Promise<Card | null> {
    return this.repo.findOne({ where: { cardId } });
  }

  // 카드명 목록으로 조회 (receipt 없는 회원에게 보여줄 기본 카드 3종 등)
  async findByNames(names: string[]): Promise<Card[]> {
    if (names.length === 0) return [];
    return this.repo.find({ where: { cardName: In(names) } });
  }

  async updateCard(cardId: string, dto: UpsertCardDto): Promise<Card | null> {
    const card = await this.findByCardId(cardId);
    if (!card) return null;

    Object.assign(card, dto);
    return this.repo.save(card);
  }

  async deleteCard(cardId: string): Promise<boolean> {
    const result = await this.repo.delete({ cardId });
    return (result.affected ?? 0) > 0;
  }
}
