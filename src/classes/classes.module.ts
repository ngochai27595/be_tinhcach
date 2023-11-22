import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassesService } from './classes.service';
import { GooglApisService } from '../googleApis/googleApis.service';
import { ClassesController } from './classes.controller';
import { Classes as ClassEntity } from './classes.entity';
import { ClassStudents as ClassStudentEntity } from './class.student.entity';
import { Transactions as TransactionEntity } from './transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassEntity,
      ClassStudentEntity,
      TransactionEntity,
    ]),
    HttpModule,
  ],
  providers: [ClassesService, GooglApisService],
  controllers: [ClassesController],
})
export class ClassesModule {}
