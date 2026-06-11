import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ConsentType } from '../../global/constants/consentType.enum';
import { User } from './user.entity';

@Entity('user_consents')
@Unique(['userId', 'consentType'])
export class UserConsent {
  @PrimaryGeneratedColumn('uuid', { name: 'consent_id' })
  consentId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'consent_type', type: 'enum', enum: ConsentType })
  consentType: ConsentType;

  @Column({ name: 'is_required', type: 'boolean' })
  isRequired: boolean;

  @Column({ name: 'is_agreed', type: 'boolean', default: false })
  isAgreed: boolean;

  @Column({ name: 'agreed_at', type: 'timestamptz', nullable: true })
  agreedAt: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
