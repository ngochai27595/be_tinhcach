import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermisionsService } from './permisions.service';
import { AuthService } from '../auth/auth.service';
import { UsersModule } from '../users/users.module';
import { JwtService } from '@nestjs/jwt';
import { PermisionsController } from './permisions.controller';
import { Permisions as PermisionEntity } from './permision.entity';
import { UserPermisions as UserPermisionEntity } from './userPermisions.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PermisionEntity]),
    HttpModule,
    UsersModule,
  ],
  exports: [
    TypeOrmModule.forFeature([PermisionEntity, UserPermisionEntity]),
    PermisionsService,
  ],
  providers: [PermisionsService, AuthService, JwtService],
  controllers: [PermisionsController],
})
export class PermisionsModule {}
