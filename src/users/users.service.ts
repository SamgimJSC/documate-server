import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/createUser.dto';
import { GetUsersQueryDto } from './dto/getUsersQuery.dto';

const users = [
  { id: 1, name: 'john', age: 20 },
  { id: 2, name: 'john2', age: 21 },
  { id: 3, name: 'john3', age: 22 },
];

@Injectable()
export class UsersService {
  async getUsers(query: GetUsersQueryDto) {
    // filter, map, sort, find, forEach
    const filteredUser = users.filter((item) => {
      // name이 존재하면 검사
      if (query.name && !item.name.includes(query.name)) {
        return false;
      }

      // age가 존재하면 검사
      if (query.age && item.age !== query.age) {
        return false;
      }

      return true;
    });

    return filteredUser;
  }

  async getOneUser(userId: number) {
    const user = users.find((item) => {
      return item.id === userId;
    });

    return user;
  }

  async createUser(createUserDto: CreateUserDto) {
    const nextId = users[users.length - 1].id + 1;

    users.push({
      id: nextId,
      name: createUserDto.name,
      age: createUserDto.age,
    });

    // users.push({
    //   id: nextId,
    //   ...createUserDto,
    // });
  }
}
