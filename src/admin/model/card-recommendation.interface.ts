import { CreateCardRecommendationDto } from '../dto/createCardRecommendation.dto';
import { CardRecommendation } from '../entities/card-recommendation.entity';

export interface CardRecommendationRepository {
  createRecommendation(
    dto: CreateCardRecommendationDto,
  ): Promise<CardRecommendation>;
  findByUserId(userId: string): Promise<CardRecommendation[]>;
  deleteByUserId(userId: string): Promise<boolean>;
}
