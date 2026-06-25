import { CreateUserDto } from '../dto/createUser.dto';
import { GetUsersQueryDto } from '../dto/getUsersQuery.dto';
import { UpdateUserDto } from '../dto/updateUser.dto';
import { User } from '../entities/user.entity';

export interface UserRepository {
  createUser(createUserDto: CreateUserDto): Promise<User>;
  findAll(query: GetUsersQueryDto): Promise<User[]>;
  findUser(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User | null>;
  incrementStorageUsedBytes(userId: string, bytes: number): Promise<void>;
  decrementStorageUsedBytes(userId: string, bytes: number): Promise<void>;
  softDeleteUser(userId: string, withdrawalReason?: string): Promise<boolean>;
}
