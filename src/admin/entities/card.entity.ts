import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid', { name: 'card_id' })
  cardId: string;

  @Column({ name: 'card_name', type: 'varchar', length: 100 })
  cardName: string;

  @Column({ name: 'issuer', type: 'varchar', length: 50, nullable: true })
  issuer: string | null;

  @Column({ name: 'benefits', type: 'jsonb', nullable: true })
  benefits: Record<string, any> | null;

  @Column({
    name: 'annual_fee',
    type: 'numeric',
    precision: 10,
    scale: 0,
    nullable: true,
  })
  annualFee: number | null;

  @Column({ name: 'img_url', type: 'varchar', length: 500, nullable: true })
  imgUrl: string | null;

  @Column({ name: 'source_url', type: 'varchar', length: 500, nullable: true })
  sourceUrl: string | null;

  @Column({ name: 'crawled_at', type: 'timestamptz', nullable: true })
  crawledAt: Date | null;
}
