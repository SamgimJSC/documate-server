import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
