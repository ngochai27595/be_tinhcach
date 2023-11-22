import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthService } from '../auth/auth.service';
import { Permisions as PermisionEntity } from './permision.entity';

@Controller('permisions')
export class PermisionsController {
  constructor(
    @InjectRepository(PermisionEntity)
    private authService: AuthService,
  ) {}
}
