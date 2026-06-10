import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { VerificationPurpose } from '../../global/constants/verificationPurpose.enum';

@Entity('email_verifications')
export class EmailVerification {
  @PrimaryGeneratedColumn('uuid', { name: 'verification_id' })
  verificationId: string;

  @Column({ name: 'email', type: 'varchar', length: 255 })
  email: string;

  @Column({ name: 'code', type: 'varchar', length: 6 })
  code: string;

  @Column({
    name: 'purpose',
    type: 'varchar',
    length: 20,
    enum: VerificationPurpose,
  })
  purpose: VerificationPurpose;

  @Column({ name: 'is_used', type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
