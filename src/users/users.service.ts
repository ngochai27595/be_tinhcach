import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Users as UserEntity } from './user.entity';
import { UserPermisions as UserPermisionEntity } from '../permisions/userPermisions.entity';

// This should be a real class/interface representing a user entity
export type User = any;

@Injectable()
export class UsersService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(UserEntity)
    private usersRepository: Repository<UserEntity>,
    @InjectRepository(UserPermisionEntity)
    private userPermisionsRepository: Repository<UserPermisionEntity>,
    private readonly httpService: HttpService,
  ) {}

  async getById(id: string): Promise<any> {
    return await this.usersRepository.findOneBy({ id: id });
  }

  async getByUsername(username: string): Promise<any> {
    return await this.usersRepository.findOneBy({ username: username });
  }

  async update(user: UserEntity) {
    return await this.usersRepository.save(user);
  }

  async findByIdAndUpdateView( id: string, remaining_view: number ) {
    return await this.dataSource.query(
      `UPDATE users
      SET remaining_view = ${remaining_view}
      WHERE id = '${id}';`,
    );
  }

  async count(role: any, search: string): Promise<any> {
    let roleSql = "WHERE p.role = 'OTHER'";
    switch (role) {
      case 'SUPER_ADMIN':
        roleSql = "WHERE p.role != 'SUPER_ADMIN' OR p.role IS NULL";
        break;
      case 'YO_ADMIN':
        roleSql = "WHERE p.role LIKE 'YO_%' OR p.role IS NULL";
        break;
      case 'KES_ADMIN':
        roleSql = "WHERE p.role LIKE 'KES_%' OR p.role IS NULL";
        break;
    }
    roleSql = `${roleSql} AND u.username LIKE "%${search}%"`;
    const rs = await this.dataSource.query(
      `SELECT COUNT(*) total
        FROM (
          SELECT u.*, GROUP_CONCAT(p.role) roles FROM users u
            LEFT JOIN user_permisions up ON up.user_id = u.id
            LEFT JOIN permisions p ON p.id = up.role_id
            ${roleSql}
            GROUP BY u.id
          ) temp;`,
    );
    return parseInt(rs[0].total);
  }

  async gets(
    role: any,
    search: string,
    skip: number = 0,
    take: number = 12,
  ): Promise<any> {
    let roleSql = "WHERE p.role = 'OTHER'";
    switch (role) {
      case 'SUPER_ADMIN':
        roleSql = "WHERE (p.role IS NULL OR p.role != 'SUPER_ADMIN')";
        break;
      case 'YO_ADMIN':
        roleSql = "WHERE (p.role IS NULL OR p.role LIKE 'YO_%')";
        break;
      case 'KES_ADMIN':
        roleSql = "WHERE (p.role IS NULL OR p.role LIKE 'KES_%')";
        break;
    }
    roleSql = `${roleSql} AND u.username LIKE "%${search}%"`;
    return await this.dataSource.query(
      `SELECT u.*, GROUP_CONCAT(p.role) roles FROM users u
      LEFT JOIN user_permisions up ON up.user_id = u.id
      LEFT JOIN permisions p ON p.id = up.role_id
      ${roleSql}
      GROUP BY u.id
      ORDER BY u.id DESC LIMIT ${take} OFFSET ${skip}`,
    );
  }

  async deletePermisionUser(user_id: string, role_id: string) {
    return await this.dataSource.query(
      `DELETE FROM user_permisions WHERE user_id = '${user_id}' AND role_id = '${role_id}'`,
    );
  }

  async addPermisionUser(data: UserPermisionEntity) {
    return await this.userPermisionsRepository.insert(data);
  }

  async findOneByConditionPermisionUser(condition: any) {
    return this.userPermisionsRepository.findOneBy(condition);
  }

  async getUsersByPermision(permision: any) {
    return this.dataSource.query(
      `SELECT u.id, u.username, u.name FROM users u
        LEFT JOIN user_permisions up ON up.user_id = u.id
        LEFT JOIN permisions p ON p.id = up.role_id
        WHERE p.role = "${permision}"
        ORDER BY u.id DESC`,
    );
  }

  async add(user: UserEntity) {
    return await this.usersRepository.insert(user);
  }

  async getPermisionOfUser(userId: string) {
    return this.dataSource.query(`
      SELECT p.role, p.id role_id FROM permisions p
        LEFT JOIN user_permisions up ON up.role_id = p.id
        WHERE up.user_id = '${userId}'
    `);
  }

  async findOne(username: string): Promise<User | undefined> {
    return { username, password: 'password' };
  }

  async findOneByCondition(condition: any) {
    return this.usersRepository.findOneBy(condition);
  }

  async findByGoogleToken(token: string) {
    try {
      const headersRequest = {
        'Content-Type': 'application/json',
      };
      const url: string = `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`;
      const response = await this.httpService
        .get(url, {
          headers: headersRequest,
        })
        .toPromise();
      return response.data;
    } catch (error) {
      return null;
    }
  }
}
