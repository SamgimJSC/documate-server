import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('spend_categories')
export class SpendCategory {
  @PrimaryGeneratedColumn('increment', { name: 'spend_category_id' })
  spendCategoryId: number;

  @Column({ name: 'name', type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ name: 'icon', type: 'varchar', length: 50, nullable: true })
  icon: string | null;
}
