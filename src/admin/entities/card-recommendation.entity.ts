import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Card } from './card.entity';

@Entity('card_recommendations')
export class CardRecommendation {
  @PrimaryGeneratedColumn('uuid', { name: 'recommendation_id' })
  recommendationId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'card_id', type: 'uuid' })
  cardId: string;

  @Column({ name: 'reason', type: 'varchar', length: 300, nullable: true })
  reason: string | null;

  @Column({
    name: 'match_score',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  matchScore: number | null;

  @Column({
    name: 'recommended_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  recommendedAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Card)
  @JoinColumn({ name: 'card_id' })
  card: Card;
}
