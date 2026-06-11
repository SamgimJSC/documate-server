import { UpsertCardDto } from '../dto/upsertCard.dto';
import { Card } from '../entities/card.entity';

export interface CardRepository {
  createCard(dto: UpsertCardDto): Promise<Card>;
  findAll(): Promise<Card[]>;
  findByCardId(cardId: string): Promise<Card | null>;
  updateCard(cardId: string, dto: UpsertCardDto): Promise<Card | null>;
  deleteCard(cardId: string): Promise<boolean>;
}
