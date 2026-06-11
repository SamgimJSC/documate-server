import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CardRecommendation } from '../entities/card-recommendation.entity';
import { CardRecommendationRepository } from './card-recommendation.interface';
import { CreateCardRecommendationDto } from '../dto/createCardRecommendation.dto';

@Injectable()
export class TypeOrmCardRecommendationRepository implements CardRecommendationRepository {
  constructor(
    @InjectRepository(CardRecommendation)
    private readonly repo: Repository<CardRecommendation>,
  ) {}

  async createRecommendation(
    dto: CreateCardRecommendationDto,
  ): Promise<CardRecommendation> {
    const recommendation = this.repo.create(dto);
    return this.repo.save(recommendation);
  }

  async findByUserId(userId: string): Promise<CardRecommendation[]> {
    return this.repo.find({
      where: { userId },
      relations: { card: true },
      order: { matchScore: 'DESC' },
    });
  }

  async deleteByUserId(userId: string): Promise<boolean> {
    const result = await this.repo.delete({ userId });
    return (result.affected ?? 0) > 0;
  }
}
