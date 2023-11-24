import {
  Controller,
  Body,
  Post,
  UseGuards,
  Query,
  Get,
  Request,
  Put,
  Param,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../auth/auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Users as UserEntity } from './user.entity';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ACCOUNT_TYPES } from 'src/auth/constants';

@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(UserEntity)
    private authService: AuthService,
    private service: UsersService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async add(
    @Body()
    body: {
      is_enable: number;
      roles: string[];
      email: string;
      name: string;
      type: number;
    },
    @Request() req: any,
  ) {
    try {
      const permisions = await this.service.getPermisionOfUser(req.user.userId);
      if (permisions.findIndex((p: any) => p.role.includes('_ADMIN')) != -1) {
        const user: any = await this.service.getByUsername(body.email);
        if (user) {
          return { status: false, msg: 'Exist!' };
        } else {
          const user = {
            id: uuidv4(),
            username: body.email,
            email: body.email,
            name: body.name,
            phone: '',
            role: '',
            type: body.type,
            is_enable: 1,
            remaining_view: 10,
          };
          await this.service.add(user);

          body.roles.map(async (role_id) => {
            await this.service.addPermisionUser({
              id: uuidv4(),
              role_id,
              user_id: user.id,
            });
          });
          return { status: true, data: user };
        }
      } else {
        return { status: false, msg: 'Not permision!' };
      }
    } catch (error) {
      return { status: false, error };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Body() body: { is_enable: number; roles: string[] },
    @Request() req: any,
    @Param() params: { id: string },
  ) {
    try {
      const permisions = await this.service.getPermisionOfUser(req.user.userId);

      if (permisions.findIndex((p: any) => p.role.includes('_ADMIN')) != -1) {
        const user: any = await this.service.getById(params.id);
        if (user) {
          const userPermisions = await this.service.getPermisionOfUser(
            params.id,
          );
          if (body.roles) {
            body.roles.map(async (role_id) => {
              let index = userPermisions.findIndex(
                (p: { role_id: string }) => p.role_id === role_id,
              );
              if (index == -1) {
                await this.service.addPermisionUser({
                  id: uuidv4(),
                  role_id,
                  user_id: params.id,
                });
              }
            });
            userPermisions.map(async (p: { role_id: string }) => {
              let index = body.roles.findIndex((r: string) => p.role_id === r);
              if (index == -1) {
                await this.service.deletePermisionUser(params.id, p.role_id);
              }
            });
          }
          await this.service.update({
            ...user,
            is_enable: body?.is_enable,
          });
          return { status: true, user, userPermisions, body };
        } else {
          return { status: false, msg: 'Not exist!' };
        }
      } else {
        return { status: false, msg: 'Not permision!' };
      }
    } catch (error) {
      return { status: false, error };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('add-permisions')
  async reply(@Body() data: any, @Request() req: any) {
    const permisions = await this.service.getPermisionOfUser(req.user.userId);

    if (
      data.role === 'YO_REVIEW' &&
      permisions.findIndex(
        (p: any) => p.role === 'SUPER_ADMIN' || p.role === 'YO_ADMIN',
      ) !== -1
    ) {
      const dataUserPermision = {
        role_id: '1015c0b9-afd4-457d-8dd6-22caeefc0a5c',
        user_id: data.userId,
      };
      const userPermision = await this.service.findOneByConditionPermisionUser(
        dataUserPermision,
      );
      if (userPermision == null) {
        await this.service.addPermisionUser({
          id: uuidv4(),
          role_id: '1015c0b9-afd4-457d-8dd6-22caeefc0a5c',
          user_id: data.userId,
        });
        const pers = await this.service.getPermisionOfUser(data.userId);
        return { status: true, data, a: req.user, permisions, pers };
      }
    }
    return { status: false };
  }

  @UseGuards(JwtAuthGuard)
  @Post('delete-permisions')
  async deletePermisions(@Body() data: any, @Request() req: any) {
    const permisions = await this.service.getPermisionOfUser(req.user.userId);

    if (
      data.role === 'YO_REVIEW' &&
      permisions.findIndex(
        (p: any) => p.role === 'SUPER_ADMIN' || p.role === 'YO_ADMIN',
      ) !== -1
    ) {
      await this.service.deletePermisionUser(
        data.userId,
        '1015c0b9-afd4-457d-8dd6-22caeefc0a5c',
      );
      const pers = await this.service.getPermisionOfUser(data.userId);
      return { status: true, data, a: req.user, permisions, pers };
    }
    return { status: false };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async gets(@Query() q: any, @Request() req: any) {
    const permisions = await this.service.getPermisionOfUser(req.user.userId);
    let role = '';
    if (permisions.findIndex((p: any) => p.role == 'KES_ADMIN') != -1) {
      role = 'KES_ADMIN';
    }
    if (permisions.findIndex((p: any) => p.role == 'YO_ADMIN') != -1) {
      role = 'YO_ADMIN';
    }
    if (permisions.findIndex((p: any) => p.role == 'SUPER_ADMIN') != -1) {
      role = 'SUPER_ADMIN';
    }
    const page = q?.page || 1;
    const search = q?.search || '';
    const take: any = 200;
    const skip: any = (page - 1) * take;
    const total = await this.service.count(role, search);
    const users = await this.service.gets(role, search, skip, take);
    return { data: users, total, page };
  }

  @UseGuards(JwtAuthGuard)
  @Get('updateView')
  async updateView(
    @Request() req: any,
    // @Param() params: { id: string },
  ) {
    try {
      // Find the user by ID and update the information
      const user: any = await this.service.getById(req.user.userId);
      if(user.remaining_view < 1) return  { status: false, msg: 'No remaining view!' };
      const updatedUser = await this.service.findByIdAndUpdateView(req.user.userId, user.remaining_view - 1);

      if (!updatedUser) {
        return { status: false, msg: 'User not exist!' };
      }

      return { status: true, remainingView: user.remaining_view - 1 };
    } catch (error) {
      return { status: false, error };
    }
  }


}


