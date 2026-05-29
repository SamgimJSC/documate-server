import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from './user.entity';
import { UserRepository } from './users.interface';
import { CreateUserDto } from './dto/createUser.dto';
import { GetUsersQueryDto } from './dto/getUsersQuery.dto';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async createUser(user: CreateUserDto) {
    const newUser = this.repo.create(user);

    return this.repo.save(newUser);
  }

  async findAll(getUsersQueryDto: GetUsersQueryDto) {
    const { name, age } = getUsersQueryDto;

    const query = this.repo.createQueryBuilder('user');

    if (name) {
      query.andWhere('user.name ILIKE :name', {
        name: `%${name}%`,
      });
    }

    if (age !== undefined) {
      query.andWhere('user.age = :age', {
        age,
      });
    }

    return query.getMany();
  }

  async findUser(userId: string) {
    return await this.repo.findOne({
      where: {
        userId,
      },
    });
  }
}
