import {
  Controller,
  Get,
  Query,
  Put,
  Param,
  Post,
  Body,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { v4 as uuidv4 } from 'uuid';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Classes as ClassEntity } from './classes.entity';
import { ClassesService } from './classes.service';
import { GooglApisService } from '../googleApis/googleApis.service';
import {
  RATES as rates,
  CLASS_TYPES as classTypes,
  SUBJECTS as subjects,
  CURRICOLUMS as curricolums,
  TRANSACTION_TYPE,
  KES_ROLE,
} from './constants';

@Controller('classes')
export class ClassesController {
  constructor(
    @InjectRepository(ClassEntity)
    private readonly httpService: HttpService,
    private service: ClassesService,
    private googleApisService: GooglApisService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('options')
  async getOptions() {
    const students = await this.service.getUsersByPermision(KES_ROLE.STUDENT);
    const teachers = await this.service.getUsersByPermision(KES_ROLE.TEACHER);
    return {
      roles: KES_ROLE,
      classTypes,
      curricolums,
      subjects,
      students,
      teachers,
      rates,
    };
  }

  @Get('dev')
  async dev() {
    return await this.service.getDev();
  }

  @UseGuards(JwtAuthGuard)
  @Get('report-student')
  async getStudentReport(@Query() q: any, @Request() req) {
    const page = q?.page || 1;
    const size = q?.size || 10;
    const startDate = q?.from_date || '0';
    const endDate = q?.to_date || '0';
    let studentId = q?.student_id || '';
    const teacherId = q?.teacher_id || '';
    const take: any = size > 1000 ? 10 : size;
    const skip: any = (page - 1) * take;

    const hasRoleAdmin = await this.service.hasRoleKes(
      req.user.userId,
      KES_ROLE.ADMIN,
    );

    const hasRoleStudent = await this.service.hasRoleKes(
      req.user.userId,
      KES_ROLE.STUDENT,
    );

    if (!hasRoleAdmin) {
      if (!hasRoleStudent) {
        return { status: false, msg: '403' };
      } else {
        studentId = req.user.userId;
      }
    }

    const total = await this.service.countStudentReport(
      studentId,
      teacherId,
      startDate,
      endDate,
    );
    const report = await this.service.getStudentReport(
      studentId,
      teacherId,
      startDate,
      endDate,
      skip,
      take,
    );
    return { data: report, total, page };
  }

  @UseGuards(JwtAuthGuard)
  @Get('report-teacher')
  async getTeacherReport(@Query() q: any, @Request() req) {
    const page = q?.page || 1;
    const size = q?.size || 10;
    let teacherId = q?.teacher_id || '';
    const startDate = q?.from_date || '0';
    const endDate = q?.to_date || '0';
    const take: any = size > 1000 ? 10 : size;
    const skip: any = (page - 1) * take;

    const hasRoleAdmin = await this.service.hasRoleKes(
      req.user.userId,
      KES_ROLE.ADMIN,
    );

    const hasRoleTeacher = await this.service.hasRoleKes(
      req.user.userId,
      KES_ROLE.TEACHER,
    );

    if (!hasRoleAdmin) {
      if (!hasRoleTeacher) {
        return { status: false, msg: '403' };
      } else {
        teacherId = req.user.userId;
      }
    }

    const total = await this.service.countSpecial(
      teacherId,
      startDate,
      endDate,
    );
    const report = await this.service.get(
      teacherId,
      startDate,
      endDate,
      skip,
      take,
    );
    return { data: report, total, page };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async gets(@Query() q: any, @Request() req) {
    const page = q?.page || 1;
    const size = q?.size || 10;
    let teacherId = q?.teacher_id || '';
    const startDate = q?.from_date || '0';
    const endDate = q?.to_date || '0';
    const take: any = size > 1000 ? 10 : size;
    const skip: any = (page - 1) * take;

    const hasRoleAdmin = await this.service.hasRoleKes(
      req.user.userId,
      KES_ROLE.ADMIN,
    );

    const hasRoleTeacher = await this.service.hasRoleKes(
      req.user.userId,
      KES_ROLE.TEACHER,
    );

    if (!hasRoleAdmin) {
      if (!hasRoleTeacher) {
        return { status: false, msg: '403' };
      } else {
        teacherId = req.user.userId;
      }
    }

    const total = await this.service.countSpecial(
      teacherId,
      startDate,
      endDate,
    );
    const classes = await this.service.get(
      teacherId,
      startDate,
      endDate,
      skip,
      take,
    );
    return { data: classes, total, page };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteClass(
    @Param() params: any,
    @Body() body: any,
    @Request() req: any,
  ) {
    try {
      const classInfo: any = await this.service.getById(params.id);
      if (classInfo) {
        await this.service.disabledClass(params.id);
        if (body.type != 1) {
          const classDayStart =
            body.type == 2 ? classInfo.class_day : '2000-01-01';
          await this.service.disabledMultiClass(
            classInfo.parent_class_id,
            classDayStart,
          );
        }
        this.googleApisService.curlSendMail(
          `Có lớp vừa được xoá đấy!\nNgày bắt đầu: ${
            classInfo.class_day
          }\nNgười tạo: ${req.user.username}\nChương trình: ${
            curricolums.find((c) => c.value == classInfo.curiculum_id).label
          }\nMôn học: ${
            subjects.find((s) => s.value == classInfo.subject_id).label
          }`,
        );
        return { status: true };
      } else {
        return { status: false, msg: '404' };
      }
    } catch (error) {
      return { status: false, msg: '404', error };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async editClass(
    @Param() params: any,
    @Body() body: any,
    @Request() req: any,
  ) {
    //T.B.D Discount
    try {
      const classInfo: any = await this.service.getById(params.id);
      if (classInfo) {
        if (body.start_time >= body.end_time) {
          return { status: false, msg: 'Sai giờ bắt đầu!' };
        }

        const {
          class_day,
          teacher_id,
          curiculum_id,
          start_time,
          subject_id,
          end_time,
          type,
        } = body;
        const date = new Date();
        const classDataUpdate = {
          class_day,
          teacher_id,
          curiculum_id,
          start_time,
          subject_id,
          end_time,
          type,
          updated_at: date.getTime() / 1000,
        };
        await this.service.update({ ...classInfo, ...classDataUpdate });
        const transaction = await this.service.getOneTransaction({
          class_id: params.id,
          user_id: classInfo.teacher_id,
        });
        const rateData = rates.find(
          (r) =>
            r.curricolum_id == body.curiculum_id &&
            r.class_scope == body.students.length,
        );
        if (teacher_id != classInfo.teacher_id) {
          this.service.updateTransaction({
            ...transaction,
            user_id: teacher_id,
            balance:
              (rateData.rate * (body.end_time - body.start_time)) / 3600 +
              rateData.bonus,
          });
        } else {
          this.service.updateTransaction({
            ...transaction,
            balance:
              (rateData.rate * (body.end_time - body.start_time)) / 3600 +
              rateData.bonus,
          });
        }
        const classStudents = await this.service.getClassStudentbyClass({
          class_id: classInfo.id,
        });
        body.students.map((student: any) => {
          if (
            classStudents.findIndex((s: any) => s.student_id == student) === -1
          ) {
            const classStudent = {
              id: uuidv4(),
              class_id: params.id,
              student_id: student,
              is_enabled: 1,
              created_at: date.getTime() / 1000,
              updated_at: date.getTime() / 1000,
              status: 1,
            };
            this.service.addClassStudent(classStudent);
            const transaction = {
              id: uuidv4(),
              class_id: params.id,
              user_id: student,
              type: TRANSACTION_TYPE.STUDENT,
              finished_by: '',
              finished_at: 0,
              description: '',
              discount_value: 0,
              balance:
                (rateData.tuition * (body.end_time - body.start_time)) / 3600,
              created_at: date.getTime() / 1000,
              updated_at: date.getTime() / 1000,
              status: 1,
            };
            this.service.addTransaction(transaction);
          }
        });

        classStudents.map(async (student: any) => {
          const transaction = await this.service.getOneTransaction({
            class_id: params.id,
            user_id: student.student_id,
          });
          if (
            body.students.findIndex((s: any) => s == student.student_id) === -1
          ) {
            await this.service.deleteTransaction(transaction.id);
            await this.service.updateClassStudent({
              ...student,
              is_enabled: 0,
            });
          } else {
            this.service.updateTransaction({
              ...transaction,
              balance:
                (rateData.tuition * (body.end_time - body.start_time)) / 3600,
            });
          }
        });
        this.googleApisService.curlSendMail(
          `Có lớp vừa được sửa đấy!\nNgày bắt đầu: ${
            classInfo.class_day
          }\nNgười tạo: ${req.user.username}\nChương trình: ${
            curricolums.find((c) => c.value == classInfo.curiculum_id).label
          }\nMôn học: ${
            subjects.find((s) => s.value == classInfo.subject_id).label
          }`,
        );
        return { status: true, classStudents };
      } else {
        return { status: false, msg: '404' };
      }
    } catch (error) {
      return { status: false, msg: '-1', error };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('transactions/:id')
  async updateTransaction(
    @Request() req,
    @Param() params: any,
    @Body() body: any,
  ) {
    const startDate = body?.from_date || '0';
    const endDate = body?.to_date || '0';
    try {
      const date = new Date();
      return {
        status: true,
        data: await this.service.updateTransactions(
          params.id,
          req.user.userId,
          date.getTime() / 1000,
          startDate,
          endDate,
        ),
      };
    } catch (error) {}
  }

  @UseGuards(JwtAuthGuard)
  @Get('report-transactions')
  async getReportTransactions() {
    try {
      const doneBalances = await this.service.sumTransaction(2);
      const notDoneBalances = await this.service.sumTransaction(1);
      return { doneBalances, notDoneBalances };
    } catch (error) {}
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTransactions(@Query() q: any, @Request() req: any) {
    const page = q?.page || 1;
    const size = q?.size || 10;
    const type = q?.type || '';
    const userId = q?.user_id || '';
    const status = q?.status || '';
    const startDate = q?.from_date || '0';
    const endDate = q?.to_date || '0';
    const take: any = size > 1000 ? 10 : size;
    const skip: any = (page - 1) * take;

    const hasRoleAdmin = await this.service.hasRoleKes(
      req.user.userId,
      KES_ROLE.ADMIN,
    );

    if (!hasRoleAdmin) {
      return { data: [], total: 0, page: 1 };
    }

    const total = await this.service.countTransaction(
      userId,
      type,
      status,
      startDate,
      endDate,
    );
    const transactions = await this.service.getTransaction(
      userId,
      type,
      status,
      startDate,
      endDate,
      skip,
      take,
    );
    return { data: transactions, total, page };
  }

  @UseGuards(JwtAuthGuard)
  @Post('transactions')
  async addTransaction(@Body() body: any, @Request() req: any) {
    try {
      if (!body.description || !body.balance) {
        return { status: false, msg: 'Thiếu tham số!' };
      }
      const date = new Date();
      const transaction = {
        id: uuidv4(),
        class_id: '',
        user_id: '',
        type: TRANSACTION_TYPE.OTHER,
        finished_by: req.user.userId,
        finished_at: date.getTime() / 1000,
        description: body.description,
        balance: body.balance,
        discount_value: 0,
        created_at: date.getTime() / 1000,
        updated_at: date.getTime() / 1000,
        status: 1,
      };
      const rs = await this.service.addTransaction(transaction);
      return { status: true, data: rs };
    } catch (error) {}
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async addClass(@Body() body: any, @Request() req) {
    try {
      //T.B.D Discount
      if (
        !body.class_day ||
        !body.curiculum_id ||
        !body.subject_id ||
        !body.start_time ||
        !body.end_time ||
        !body.type ||
        !body.students
      ) {
        return { status: false, msg: 'Thiếu tham số!' };
      }
      let teacher_id: any;

      const hasRoleAdmin = await this.service.hasRoleKes(
        req.user.userId,
        KES_ROLE.ADMIN,
      );

      const hasRoleTeacher = await this.service.hasRoleKes(
        req.user.userId,
        KES_ROLE.TEACHER,
      );

      if (body.teacher_id && hasRoleAdmin) {
        teacher_id = body.teacher_id;
      } else {
        if (hasRoleTeacher) {
          teacher_id = req.user.userId;
        } else {
          return { status: false, msg: 'Thiếu tham số!' };
        }
      }

      if (body.start_time >= body.end_time) {
        return { status: false, msg: 'Sai giờ bắt đầu!' };
      }

      const dateClass: any = new Date(body.class_day);
      const dateClassSecond: any = dateClass.getTime();
      const dateLast: any = new Date('2023-12-31');
      const dateLastSecond: any = dateLast.getTime();
      let dateTemp: any = dateClassSecond;
      const parent_class_id = uuidv4();
      for (let index = 0; index <= 53; index++) {
        if (dateTemp <= dateLastSecond) {
          const date = new Date(dateTemp);
          const classDay = `${date.getFullYear()}-${
            date.getMonth() + 1 < 10
              ? '0' + (date.getMonth() + 1)
              : date.getMonth() + 1
          }-${date.getDate() < 10 ? '0' + date.getDate() : date.getDate()}`;
          const classData = {
            id: uuidv4(),
            teacher_id,
            class_day: classDay,
            curiculum_id: body.curiculum_id,
            subject_id: body.subject_id,
            start_time: body.start_time,
            end_time: body.end_time,
            type: body.type,
            created_at: date.getTime() / 1000,
            updated_at: date.getTime() / 1000,
            status: 1,
            parent_class_id,
          };
          this.service.addClass(classData);
          const rateData = rates.find(
            (r) =>
              r.curricolum_id == body.curiculum_id &&
              r.class_scope == body.students.length,
          );
          const transaction = {
            id: uuidv4(),
            class_id: classData.id,
            user_id: teacher_id,
            type: TRANSACTION_TYPE.TEACHER,
            finished_by: '',
            finished_at: 0,
            description: '',
            discount_value: 0,
            balance:
              (rateData.rate * (body.end_time - body.start_time)) / 3600 +
              rateData.bonus,
            created_at: date.getTime() / 1000,
            updated_at: date.getTime() / 1000,
            status: 1,
          };
          this.service.addTransaction(transaction);
          body.students.map((student: any) => {
            const classStudent = {
              id: uuidv4(),
              class_id: classData.id,
              student_id: student,
              is_enabled: 1,
              created_at: date.getTime() / 1000,
              updated_at: date.getTime() / 1000,
              status: 1,
            };
            this.service.addClassStudent(classStudent);
            const transaction = {
              id: uuidv4(),
              class_id: classData.id,
              user_id: student,
              type: TRANSACTION_TYPE.STUDENT,
              finished_by: '',
              finished_at: 0,
              description: '',
              discount_value: 0,
              balance:
                (rateData.tuition * (body.end_time - body.start_time)) / 3600,
              created_at: date.getTime() / 1000,
              updated_at: date.getTime() / 1000,
              status: 1,
            };
            this.service.addTransaction(transaction);
          });
        }
        if (body.type == 1) {
          dateTemp += 86400 * 7 * 1000;
        } else {
          dateTemp += 55 * 86400 * 7 * 1000;
        }
      }
      this.googleApisService.curlSendMail(
        `Có lớp vừa được tạo đấy!\nNgày bắt đầu: ${
          body.class_day
        }\nNgười tạo: ${req.user.username}\nChương trình: ${
          curricolums.find((c) => c.value == body.curiculum_id).label
        }\nMôn học: ${subjects.find((s) => s.value == body.subject_id).label}`,
      );
      return { status: true };
    } catch (error) {
      return { status: false, msg: '-1', error };
    }
  }
}
