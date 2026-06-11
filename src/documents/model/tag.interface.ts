import { CreateTagDto } from '../dto/createTag.dto';
import { Tag } from '../entities/tag.entity';

export interface TagRepository {
  createTag(dto: CreateTagDto): Promise<Tag>;
  findByUserId(userId: string): Promise<Tag[]>;
  findByTagId(tagId: string): Promise<Tag | null>;
  findByUserIdAndName(userId: string, name: string): Promise<Tag | null>;
  deleteTag(tagId: string): Promise<boolean>;
}
