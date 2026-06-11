import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { Card } from './entities/card.entity';
import { CardRecommendation } from './entities/card-recommendation.entity';
import { TypeOrmCardRepository } from './model/card.repository';
import { TypeOrmCardRecommendationRepository } from './model/card-recommendation.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Card, CardRecommendation])],
  controllers: [AdminController],
  exports: [TypeOrmModule, AdminService],
  providers: [
    AdminService,
    TypeOrmCardRepository,
    TypeOrmCardRecommendationRepository,
  ],
})
export class AdminModule {}
