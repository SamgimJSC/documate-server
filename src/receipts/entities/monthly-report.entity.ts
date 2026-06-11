import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('monthly_reports')
@Unique(['userId', 'reportYear', 'reportMonth'])
export class MonthlyReport {
  @PrimaryGeneratedColumn('uuid', { name: 'report_id' })
  reportId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'report_year', type: 'smallint' })
  reportYear: number;

  @Column({ name: 'report_month', type: 'smallint' })
  reportMonth: number;

  @Column({
    name: 'total_spend',
    type: 'numeric',
    precision: 12,
    scale: 0,
    default: 0,
  })
  totalSpend: number;

  @Column({ name: 'receipt_count', type: 'integer', default: 0 })
  receiptCount: number;

  @Column({
    name: 'prev_month_diff_pct',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  prevMonthDiffPct: number | null;

  @Column({
    name: 'predicted_spend',
    type: 'numeric',
    precision: 12,
    scale: 0,
    nullable: true,
  })
  predictedSpend: number | null;

  @Column({
    name: 'prediction_confidence',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  predictionConfidence: number | null;

  @Column({ name: 'category_breakdown', type: 'jsonb', nullable: true })
  categoryBreakdown: Record<string, any> | null;

  @Column({ name: 'ai_analysis', type: 'text', nullable: true })
  aiAnalysis: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
