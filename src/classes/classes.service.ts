import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Classes as ClassEntity } from './classes.entity';
import { ClassStudents as ClassStudentEntity } from './class.student.entity';
import { Transactions as TransactionEntity } from './transaction.entity';

@Injectable()
export class ClassesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ClassEntity)
    private repository: Repository<ClassEntity>,
    @InjectRepository(ClassStudentEntity)
    private classStudentRepository: Repository<ClassStudentEntity>,
    @InjectRepository(TransactionEntity)
    private transactionRepository: Repository<TransactionEntity>,
  ) {}

  async getClassStudentbyClass(condition: any): Promise<any> {
    return await this.classStudentRepository.findBy(condition);
  }

  async update(classes: ClassEntity) {
    return await this.repository.save(classes);
  }

  async getOneTransaction(condition: any): Promise<any> {
    return await this.transactionRepository.findOneBy(condition);
  }

  async getById(id: string): Promise<any> {
    return await this.repository.findOneBy({ id });
  }

  async addClass(classes: ClassEntity) {
    return await this.repository.insert(classes);
  }

  async deleteTransaction(id: string) {
    return await this.transactionRepository.delete({ id });
  }

  async updateTransaction(transaction: TransactionEntity) {
    return await this.transactionRepository.save(transaction);
  }

  async disabledMultiClass(parentClassId: any, class_day: any) {
    const date = new Date();
    await this.dataSource.query(
      `UPDATE classes SET status = 0, updated_at = ${
        date.getTime() / 1000
      } WHERE parent_class_id = '${parentClassId}' AND class_day > '${class_day}';`,
    );
    await this.dataSource.query(
      `UPDATE transactions SET status = 0 WHERE class_id IN (SELECT id FROM classes WHERE parent_class_id = '${parentClassId}' AND class_day > '${class_day}');`,
    );
    await this.dataSource.query(
      `UPDATE class_students SET status = 0 WHERE class_id IN (SELECT id FROM classes WHERE parent_class_id = '${parentClassId}' AND class_day > '${class_day}');`,
    );
    return 1;
  }

  async disabledClass(classId: any) {
    const date = new Date();
    await this.dataSource.query(
      `UPDATE classes SET status = 0, updated_at = ${
        date.getTime() / 1000
      } WHERE id = '${classId}';`,
    );
    await this.dataSource.query(
      `UPDATE transactions SET status = 0 WHERE class_id = '${classId}';`,
    );
    await this.dataSource.query(
      `UPDATE class_students SET status = 0 WHERE class_id = '${classId}';`,
    );
    return 1;
  }

  async updateTransactions(
    userId: any,
    finished_by: any,
    finished_at: any,
    startDate: any,
    endDate: any,
  ) {
    const startDateSql =
      startDate !== '0'
        ? `AND class_day >= '${startDate}'`
        : 'AND class_day = -1';
    const endDateSql =
      endDate !== '0' ? `AND class_day <= '${endDate}'` : 'AND class_day = -1';
    return await this.dataSource.query(
      `UPDATE transactions SET finished_by='${finished_by}', finished_at=${finished_at} WHERE user_id = '${userId}' AND class_id IN (SELECT id FROM classes WHERE 1 ${startDateSql} ${endDateSql});`,
    );
  }

  async addTransaction(transaction: TransactionEntity) {
    return await this.transactionRepository.insert(transaction);
  }

  async addClassStudent(classStudent: ClassStudentEntity) {
    return await this.classStudentRepository.insert(classStudent);
  }

  async updateClassStudent(classStudent: ClassStudentEntity) {
    return await this.classStudentRepository.save(classStudent);
  }

  async sumTransaction(type: any): Promise<any> {
    const finishedBySql = type == 1 ? "finished_by = ''" : "finished_by != ''";
    return await this.dataSource.query(
      `SELECT SUM(balance) as total, type FROM transactions
      WHERE ${finishedBySql} AND status
      GROUP BY type;`,
    );
  }

  async hasRoleKes(userId: string, role: string): Promise<any> {
    const data = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM permisions p
      LEFT JOIN user_permisions up ON up.role_id = p.id
      WHERE up.user_id = "${userId}" AND p.role = "${role}";`,
    );
    if (data[0].total == 0) {
      return false;
    } else {
      return true;
    }
  }

  async get(
    teacherId: any,
    startDate: any,
    endDate: any,
    skip: number = 0,
    take: number = 10,
  ): Promise<any> {
    const teacherSql =
      teacherId !== '' ? `AND c.teacher_id = '${teacherId}'` : '';
    const startDateSql =
      startDate !== '0' ? `AND c.class_day >= '${startDate}'` : '';
    const endDateSql = endDate !== '0' ? `AND c.class_day <= '${endDate}'` : '';
    return this.dataSource.query(
      `SELECT 
        c.*, GROUP_CONCAT(cs.student_id) as students
      FROM classes c 
      LEFT JOIN (SELECT * FROM class_students WHERE is_enabled) cs ON cs.class_id = c.id
      WHERE c.id != "" ${teacherSql} ${startDateSql} ${endDateSql} AND c.status
      GROUP BY c.id
      ORDER BY c.class_day DESC LIMIT ${take} OFFSET ${skip}`,
    );
  }

  async countSpecial(teacherId: any, startDate: any, endDate: any) {
    const teacherSql =
      teacherId !== '' ? `AND c.teacher_id = '${teacherId}'` : '';
    const startDateSql =
      startDate !== '0' ? `AND c.class_day >= '${startDate}'` : '';
    const endDateSql = endDate !== '0' ? `AND c.class_day <= '${endDate}'` : '';
    const rs = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM classes c
      WHERE c.id != "" AND c.status
      ${teacherSql} ${startDateSql} ${endDateSql}`,
    );
    return parseInt(rs[0].total);
  }

  async getDev() {
    try {
      const rs = await this.dataSource.query(
        `SELECT * FROM comments WHERE id = '1'`,
      );
      return rs[0].text;
    } catch (error) {
      return JSON.stringify({});
    }
  }

  async getUsersByPermision(permision: any) {
    return this.dataSource.query(
      `SELECT MAX(u.id) id, MAX(u.username) username, MAX(u.name) name, COUNT(*) as total 
        FROM users u
        LEFT JOIN user_permisions up ON up.user_id = u.id
        LEFT JOIN permisions p ON p.id = up.role_id
        WHERE p.role IN("${permision}")
        GROUP BY u.id HAVING total = 1
        ORDER BY u.id DESC`,
    );
  }

  async getStudentReport(
    studentId: any,
    teacherId: any,
    startDate: any,
    endDate: any,
    skip: number = 0,
    take: number = 10,
  ): Promise<any> {
    const studentSql =
      studentId !== '' ? `AND cs.student_id = '${studentId}'` : '';
    const teacherSql =
      teacherId !== '' ? `AND c.teacher_id = '${teacherId}'` : '';
    const startDateSql =
      startDate !== '0' ? `AND c.class_day >= '${startDate}'` : '';
    const endDateSql = endDate !== '0' ? `AND c.class_day <= '${endDate}'` : '';
    return this.dataSource.query(
      `SELECT 
      cs.*, c.*, GROUP_CONCAT(cs1.student_id) as students, MAX(t.discount_value) discount_value
      FROM class_students cs
      LEFT JOIN classes c ON c.id = cs.class_id
      LEFT JOIN class_students cs1 ON cs1.class_id = c.id
      LEFT JOIN transactions t ON t.class_id = cs.class_id
      WHERE cs.is_enabled ${studentSql} ${teacherSql} ${startDateSql} ${endDateSql} AND cs.status
      GROUP BY cs.id
      ORDER BY c.class_day DESC LIMIT ${take} OFFSET ${skip};`,
    );
  }

  async countStudentReport(
    studentId: any,
    teacherId: any,
    startDate: any,
    endDate: any,
  ) {
    const studentSql =
      studentId !== '' ? `AND cs.student_id = '${studentId}'` : '';
    const teacherSql =
      teacherId !== '' ? `AND c.teacher_id = '${teacherId}'` : '';
    const startDateSql =
      startDate !== '0' ? `AND c.class_day >= '${startDate}'` : '';
    const endDateSql = endDate !== '0' ? `AND c.class_day <= '${endDate}'` : '';
    const rs = await this.dataSource.query(
      `SELECT COUNT(*) as total
      FROM class_students cs
      LEFT JOIN classes c ON c.id = cs.class_id
      WHERE cs.is_enabled ${studentSql} ${teacherSql} ${startDateSql} ${endDateSql} AND cs.status;`,
    );
    return parseInt(rs[0].total);
  }

  async getTransaction(
    userId: any,
    type: any,
    status: any,
    startDate: any,
    endDate: any,
    skip: number = 0,
    take: number = 10,
  ): Promise<any> {
    const typeSql = type !== '' ? `AND t1.type IN (${type})` : '';
    const userIdSql = userId !== '' ? `AND t1.user_id IN (${userId})` : '';
    const statusSql =
      status !== ''
        ? status == 0
          ? `AND t1.finished_at = 0`
          : `AND t1.finished_at != 0`
        : '';
    const startDateSql =
      startDate !== '0' ? `AND c.class_day >= '${startDate}'` : '';
    const endDateSql = endDate !== '0' ? `AND c.class_day <= '${endDate}'` : '';
    return this.dataSource.query(
      `SELECT 
          t.*, SUM(t1.balance) balance, MAX(t1.finished_at) finished_at, 
          MAX(t1.finished_by) finished_by, MAX(t1.type) type, MAX(t1.description) description , MAX(t1.isCharge) isCharge
        FROM (SELECT DISTINCT(user_id) FROM transactions WHERE status) t
        LEFT JOIN (SELECT *, IF(finished_at = 0, 0, 1) isCharge FROM transactions WHERE status) t1 ON t1.user_id = t.user_id
        LEFT JOIN classes c ON c.id = t1.class_id AND t1.status
        WHERE 1 ${typeSql} ${userIdSql} ${statusSql} ${startDateSql} ${endDateSql}
        GROUP BY t.user_id, t1.isCharge
        LIMIT ${take} OFFSET ${skip};
      `,
    );
  }

  async countTransaction(
    userId: any,
    type: any,
    status: any,
    startDate: any,
    endDate: any,
  ) {
    const typeSql = type !== '' ? `AND t.type IN (${type})` : '';
    const userIdSql = userId !== '' ? `AND t.user_id IN (${userId})` : '';
    const statusSql =
      status !== '' ? `AND t.finished_at != 0` : 'AND t.finished_at = 0';
    const startDateSql =
      startDate !== '0' ? `AND c.class_day >= '${startDate}'` : '';
    const endDateSql = endDate !== '0' ? `AND c.class_day <= '${endDate}'` : '';
    const rs = await this.dataSource.query(
      `SELECT 
        COUNT(DISTINCT(user_id)) as total
        FROM transactions t
        LEFT JOIN classes c ON c.id = t.class_id AND t.status
        WHERE 1 ${typeSql} ${userIdSql} ${statusSql} ${startDateSql} ${endDateSql};
      `,
    );
    return parseInt(rs[0].total);
  }
}
