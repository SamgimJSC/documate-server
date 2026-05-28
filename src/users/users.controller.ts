import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/createUser.dto';
import { GetUsersQueryDto } from './dto/getUsersQuery.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async getUsers(
    @Query(new ValidationPipe({ transform: true }))
    query: GetUsersQueryDto,
  ) {
    console.log(query);
    return this.usersService.getUsers(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) userId: number) {
    return this.usersService.getOneUser(userId);
  }

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto) {
    console.log(createUserDto);

    return this.usersService.createUser(createUserDto);
  }
}
