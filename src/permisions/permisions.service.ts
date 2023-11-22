import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permisions as PermisionEntity } from './permision.entity';

@Injectable()
export class PermisionsService {
  constructor(
    @InjectRepository(PermisionEntity)
    private usesRepository: Repository<PermisionEntity>,
  ) {}
}
