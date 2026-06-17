import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Tag } from '../entities/tag.entity';
import { TagRepository } from './tag.interface';
import { CreateTagDto } from '../dto/createTag.dto';

@Injectable()
export class TypeOrmTagRepository implements TagRepository {
  constructor(
    @InjectRepository(Tag)
    private readonly repo: Repository<Tag>,
  ) {}

  async createTag(dto: CreateTagDto): Promise<Tag> {
    const tag = this.repo.create(dto);
    return this.repo.save(tag);
  }

  async findByUserId(userId: string): Promise<Tag[]> {
    return this.repo.find({ where: { userId } });
  }

  async findByTagId(tagId: string): Promise<Tag | null> {
    return this.repo.findOne({ where: { tagId } });
  }

  async findByUserIdAndName(userId: string, name: string): Promise<Tag | null> {
    return this.repo.findOne({ where: { userId, name } });
  }

  async findOrCreate(userId: string, name: string): Promise<Tag> {
    try {
      const tag = this.repo.create({ userId, name });
      return await this.repo.save(tag);
    } catch (e) {
      if (!(e instanceof Error && 'code' in e && e.code === '23505')) {
        throw e;
      }
      const existing = await this.repo.findOne({ where: { userId, name } });
      if (!existing) throw e;
      return existing;
    }
  }

  async deleteTag(tagId: string): Promise<boolean> {
    const result = await this.repo.delete({ tagId });
    return (result.affected ?? 0) > 0;
  }
}
