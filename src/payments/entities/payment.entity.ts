import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentStatus } from '../../global/constants/paymentStatus.enum';
import { User } from '../../users/entities/user.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid', { name: 'payment_id' })
  paymentId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  subscriptionId: string | null;

  @Column({ name: 'method_id', type: 'uuid', nullable: true })
  methodId: string | null;

  @Column({ name: 'tid', type: 'varchar', length: 100, unique: true, nullable: true })
  tid: string | null;

  @Column({ name: 'amount', type: 'numeric', precision: 10, scale: 0 })
  amount: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.READY,
  })
  status: PaymentStatus;

  @Column({ name: 'fail_reason', type: 'varchar', length: 200, nullable: true })
  failReason: string | null;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
