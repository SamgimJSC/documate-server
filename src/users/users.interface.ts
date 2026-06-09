import { CreateUserDto } from './dto/createUser.dto';
import { GetUsersQueryDto } from './dto/getUsersQuery.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { User } from './user.entity';

export interface UserRepository {
  createUser(createUserDto: CreateUserDto): Promise<User>;
  findAll(query: GetUsersQueryDto): Promise<User[]>;
  findUser(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User | null>;
  softDeleteUser(userId: string, withdrawalReason?: string): Promise<boolean>;
}
