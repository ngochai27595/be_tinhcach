import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ACCOUNT_TYPES, jwtConstants } from './constants';
var md5 = require('md5');

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    console.log("hainn----validateUser-----",username, pass);
    if (pass == '0') {
      console.log("hainn----userGoogle---");
      const userGoogle = await this.usersService.findByGoogleToken(username);
      if (userGoogle) {
        const user = await this.usersService.findOneByCondition({
          email: userGoogle.email,
        });
        if (user) {
          const permisions = await this.usersService.getPermisionOfUser(
            user.id,
          );
          return { ...user, permisions };
        } else {
          const userAdd = {
            id: uuidv4(),
            username: userGoogle.email,
            email: userGoogle.email,
            name: userGoogle.name,
            phone: '',
            role: '',
            type: ACCOUNT_TYPES.DEFAULT,
            is_enable: 1,
            remaining_view: 10,
          };
          this.usersService.add(userAdd);
          return { ...userAdd, permisions: [] };
        }
      }
    } else {
      if (md5(`snow${username}`) == pass) {
        const user = await this.usersService.findOneByCondition({
          email: username,
        });
        if (user) {
          const permisions = await this.usersService.getPermisionOfUser(
            user.id,
          );
          return { ...user, permisions };
        }
      }
    }
    return null;
  }

  async login(user: any) {
    console.log("AnhLH", user)
    const payload = {
      username: user.username,
      sub: user.id,
      permisions: user.permisions,
    };
    return {
      access_token: this.jwtService.sign(payload, {
        secret: jwtConstants.secret,
      }),
      ...user,
    };
  }
}
