import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { PaymentMethodType } from '../../global/constants/paymentMethodType.enum';
import { User } from '../../users/entities/user.entity';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid', { name: 'method_id' })
  methodId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'method_type', type: 'enum', enum: PaymentMethodType })
  methodType: PaymentMethodType;

  @Column({ name: 'billing_key', type: 'varchar', length: 255 })
  billingKey: string;

  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  displayName: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
