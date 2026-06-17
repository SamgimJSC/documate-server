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
import { DOCUMENT_TAG_NAME_MAX_LENGTH } from '../../global/constants/document-limit.const';

@Entity('tags')
@Unique(['userId', 'name'])
export class Tag {
  @PrimaryGeneratedColumn('uuid', { name: 'tag_id' })
  tagId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({
    name: 'name',
    type: 'varchar',
    length: DOCUMENT_TAG_NAME_MAX_LENGTH,
  })
  name: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
