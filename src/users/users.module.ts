import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersController } from './users.controller';
import { Users as UserEntity } from './user.entity';
import { UserPermisions as UserPermisionEntity } from '../permisions/userPermisions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, UserPermisionEntity]),
    HttpModule,
  ],
  exports: [TypeOrmModule.forFeature([UserEntity]), UsersService],
  providers: [UsersService, AuthService, JwtService],
  controllers: [UsersController],
})
export class UsersModule {}
