import { CreateUserDto } from './dto/createUser.dto';
import { User } from './user.entity';
import { GetUsersQueryDto } from './dto/getUsersQuery.dto';

export interface UserRepository {
  createUser(createUserDto: CreateUserDto): Promise<User>;
  findAll(getUsersQueryDto: GetUsersQueryDto): Promise<User[]>;
  findUser(userId: string): Promise<User | null>;
}
