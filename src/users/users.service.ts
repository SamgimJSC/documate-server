import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/createUser.dto';
import { GetUsersQueryDto } from './dto/getUsersQuery.dto';
import { UpdateUserDto } from './dto/updateUser.dto';
import { TypeOrmUserRepository } from './users.repository';
import { type UserRepository } from './users.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject(TypeOrmUserRepository)
    private readonly userRepo: UserRepository,
  ) {}

  async getUsers(query: GetUsersQueryDto) {
    return this.userRepo.findAll(query);
  }

  async getOneUser(userId: string) {
    const user = await this.userRepo.findUser(userId);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  async createUser(createUserDto: CreateUserDto) {
    const existing = await this.userRepo.findByEmail(createUserDto.email);
    if (existing) throw new ConflictException('이미 사용 중인 이메일입니다.');

    return this.userRepo.createUser(createUserDto);
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    if (updateUserDto.email) {
      const existing = await this.userRepo.findByEmail(updateUserDto.email);
      if (existing && existing.userId !== userId) {
        throw new ConflictException('이미 사용 중인 이메일입니다.');
      }
    }

    const updated = await this.userRepo.updateUser(userId, updateUserDto);
    if (!updated) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return updated;
  }

  async deleteUser(userId: string, withdrawalReason?: string) {
    const deleted: boolean = await this.userRepo.softDeleteUser(
      userId,
      withdrawalReason,
    );
    if (!deleted) throw new NotFoundException('사용자를 찾을 수 없습니다.');
  }
}
