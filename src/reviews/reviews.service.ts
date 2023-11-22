import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, Not, Equal } from 'typeorm';
import { Reviews as ReviewEntity } from './review.entity';
import { Comments as CommentEntity } from './comment.entity';
import { Labels as LabelEntity } from './label.entity';
import { ReviewValues as ReviewValueEntity } from './review.values.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ReviewEntity)
    private reviewsRepository: Repository<ReviewEntity>,
    @InjectRepository(CommentEntity)
    private commentsRepository: Repository<CommentEntity>,
    @InjectRepository(LabelEntity)
    private labelsRepository: Repository<LabelEntity>,
    @InjectRepository(ReviewValueEntity)
    private reviewValuesRepository: Repository<ReviewValueEntity>,
  ) {}

  async getLabelByName(name: any) {
    return await this.labelsRepository.findOneBy({ name });
  }

  async getLabelById(id: string): Promise<any> {
    return await this.labelsRepository.findOneBy({ id });
  }

  async getLabels(skip: number = 0, take: number = 10): Promise<any> {
    return this.dataSource.query(
      `SELECT * FROM labels l
      ORDER BY l.updated_at DESC LIMIT ${take} OFFSET ${skip}`,
    );
  }

  async get(
    replyby: any,
    rate: number,
    language: string,
    os: string,
    label: string,
    isReplied: any,
    textLike: any,
    versionName: any,
    skip: number = 0,
    take: number = 10,
  ): Promise<any> {
    const versionNameSql =
      versionName !== '' ? `AND c.appVersionName IN (${versionName})` : '';
    const sqlLang =
      language !== '' ? `AND c.reviewerLanguage IN (${language})` : '';
    const sqlLabel = label !== '' ? `AND rv2.value IN (${label})` : '';
    const sqlOs = os !== '' ? `AND r.os IN (${os})` : '';
    const sqlReplyBy =
      replyby !== null ? `AND c2.createdBy IN (${replyby})` : '';
    const sqlRate = rate !== -1 ? `AND c.rate IN (${rate})` : '';
    const sqlIsReplied =
      isReplied !== null
        ? isReplied == 0
          ? 'AND c2.createdBy IS NULL'
          : isReplied == 1
          ? 'AND c2.createdBy IS NOT NULL'
          : 'AND c2.createdBy IS NOT NULL AND r.updated_at > c2.lastModified AND r.created_at < c2.lastModified'
        : '';
    const sqlTextLike =
      textLike !== '' ? `AND c.originalText LIKE "%${textLike}%"` : '';
    return this.dataSource.query(
      `SELECT 
        r.*, MAX(c.deviceMetadata) deviceMetadata, MAX(c.osVerion) osVerion, MAX(c.lastModified) lastModified
        , MAX(c.reviewerLanguage) reviewerLanguage, MAX(c.rate) rate,MAX(c.text) text, MAX(c.originalText) originalText
        , MAX(c.enText) enText, MAX(c.appVersionCode) appVersionCode, MAX(c.appVersionName) appVersionName
        ,MAX(c2.createdBy) createdBy, MAX(c2.lastModified) uLastModified, MAX(c2.text) uText
        ,group_concat(rv.value) labels, MAX(rv.createdBy) as labelCreatedBy
      FROM reviews r
      LEFT JOIN (SELECT * FROM comments WHERE type = 0) c ON c.reviewId = r.id
      LEFT JOIN (SELECT * FROM comments WHERE type = 1) c2 ON c2.reviewId = r.id
      LEFT JOIN (SELECT * FROM review_values WHERE field_id < 3 AND is_enable) rv ON rv.review_id = r.id
      LEFT JOIN (SELECT * FROM review_values WHERE field_id < 3 AND is_enable) rv2 ON rv2.review_id = r.id
      WHERE r.id != "" ${sqlLang} ${sqlRate} ${sqlReplyBy} ${sqlIsReplied} ${sqlTextLike} ${versionNameSql} ${sqlLabel} ${sqlOs}
      GROUP BY r.id
      ORDER BY r.updated_at DESC LIMIT ${take} OFFSET ${skip}`,
    );
  }

  async renderLabelReport(start: any, end: any): Promise<any> {
    const startSql = start !== '' ? `AND r.created_at >= ${start}` : '';
    const endSql = end !== '' ? `AND r.created_at <= ${end}` : '';
    return await this.dataSource.query(
      `WITH temp as (SELECT rv.review_id, rv.value, IF (l.name IS NULL , rv.value, l.name) label, l.level, l.id FROM review_values rv
        LEFT JOIN labels l ON l.id = rv.value
        LEFT JOIN reviews r ON r.id = rv.review_id
        WHERE rv.field_id IN (1,2) ${startSql} ${endSql}
        )
      SELECT label, level, id, COUNT(*) total 
        FROM temp
        GROUP BY label, level, id
        ORDER BY total DESC;`,
    );
  }

  async renderReport(): Promise<any> {
    const reviews = await this.dataSource.query(
      `SELECT date, COUNT(*) total 
      FROM (SELECT DATE_FORMAT(FROM_UNIXTIME(created_at  + 3600 * 7), '%Y-%c-%d') date FROM reviews) temp
      GROUP BY date ORDER BY date DESC;`,
    );
    const comments = await this.dataSource.query(
      `SELECT date, createdBy, COUNT(*) total 
      FROM (SELECT DATE_FORMAT(FROM_UNIXTIME(lastModified  + 3600 * 7), '%Y-%c-%d') date, createdBy FROM comments WHERE type = 1) temp
      GROUP BY date, createdBy ORDER BY date DESC;`,
    );
    const commentTotals = await this.dataSource.query(
      `SELECT createdBy, COUNT(*) total 
      FROM (SELECT DATE_FORMAT(FROM_UNIXTIME(lastModified  + 3600 * 7), '%Y-%c-%d') date, createdBy FROM comments WHERE type = 1) temp
      GROUP BY createdBy ORDER BY total DESC;`,
    );
    const rates = await this.dataSource.query(
      `SELECT date, rate, COUNT(*) total
        FROM
          (SELECT DATE_FORMAT(FROM_UNIXTIME(created_at  + 3600 * 7), '%Y-%c-%d') date, c.rate FROM reviews r
            LEFT JOIN (SELECT * FROM comments WHERE type = 0) c ON c.reviewId = r.id) temp
        GROUP BY date, rate ORDER BY date DESC;`,
    );
    const rateTotals = await this.dataSource.query(
      `SELECT rate, COUNT(*) total
        FROM
          (SELECT DATE_FORMAT(FROM_UNIXTIME(lastModified  + 3600 * 7), '%Y-%c-%d') date, c.rate FROM reviews r
            LEFT JOIN (SELECT * FROM comments WHERE type = 0) c ON c.reviewId = r.id) temp
        WHERE rate IS NOT NULL
        GROUP BY rate ORDER BY total DESC;`,
    );
    const rateByOSAndStatusTotals = await this.dataSource.query(
      `SELECT date, os, isReplyed, COUNT(*) total 
        FROM (SELECT DATE_FORMAT(FROM_UNIXTIME(created_at  + 3600 * 7), '%Y-%c-%d') date, os, IF(c.id IS NULL, 0, 1) isReplyed
          FROM reviews r
          LEFT JOIN (SELECT * FROM comments WHERE type = 1) c ON c.reviewId = r.id
        ) temp
        GROUP BY date, os, isReplyed ORDER BY date DESC;`,
    );
    const createrLabels = await this.dataSource.query(
      `SELECT MAX(createdBy) createdBy , COUNT(*) total
        FROM (SELECT MAX(review_id) review_id, MAX(createdBy) createdBy FROM review_values WHERE is_enable GROUP BY review_id) temp
        GROUP BY createdBy
        ORDER BY total DESC;`,
    );
    const labelByDateCreateReview = await this.dataSource.query(`
      SELECT c, v, COUNT(*) total FROM
      (SELECT rv.value v, DATE_FORMAT(FROM_UNIXTIME(r.created_at  + 3600 * 7), '%Y-%c-%d') c
        FROM review_values rv 
        LEFT JOIN reviews r ON r.id = rv.review_id
        LEFT JOIN labels l ON l.id = rv.value
        WHERE rv.field_id = 1 AND l.level = 2) temp
        GROUP BY c,v
        ORDER BY c DESC`);
    return {
      reviews,
      comments,
      commentTotals,
      rates,
      rateTotals,
      rateByOSAndStatusTotals,
      createrLabels,
      labelByDateCreateReview,
    };
  }

  async getById(id: string): Promise<any> {
    return await this.reviewsRepository.findOneBy({ id });
  }

  async getCommentNotExistEnText(): Promise<any> {
    return await this.commentsRepository.findOneBy({
      type: 0,
      enText: '',
      osVerion: Not(Equal(0)),
    });
  }

  async getCommentById(id: string): Promise<any> {
    return await this.commentsRepository.findOneBy({ id: id });
  }

  async getReplyAuthors(): Promise<any> {
    return this.dataSource.query(
      `SELECT DISTINCT(createdBy) FROM comments WHERE createdBy != ""`,
    );
  }

  async getAppVersionNames(): Promise<any> {
    return this.dataSource.query(
      `SELECT DISTINCT(appVersionName)
        FROM comments c
        WHERE appVersionName != ""
        ORDER BY appVersionName DESC;`,
    );
  }

  async getLanguages(): Promise<any> {
    return this.dataSource.query(
      `SELECT DISTINCT(reviewerLanguage), l.name
        FROM comments c
        JOIN languageCodes l ON l.code = reviewerLanguage
        WHERE reviewerLanguage != ""
        ORDER BY name ASC;`,
    );
  }

  async getComments(condition: any): Promise<any> {
    return await this.commentsRepository.findBy(condition);
  }

  async getReviewLabels(condition: any): Promise<any> {
    return await this.reviewValuesRepository.findBy(condition);
  }

  async countLabel() {
    const rs = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM labels`,
    );
    return parseInt(rs[0].total);
  }

  async countSpecial(
    replyby: any,
    rate: number,
    language: string,
    os: string,
    label: string,
    isReplied: any,
    textLike: any,
    versionName: any,
  ) {
    const versionNameSql =
      versionName !== '' ? `AND c.appVersionName IN (${versionName})` : '';
    const sqlLang =
      language !== '' ? `AND c.reviewerLanguage IN (${language})` : '';
    const sqlLabel = label !== '' ? `WHERE value IN (${label})` : '';
    const sqlOs = os !== '' ? `AND r.os IN (${os})` : '';
    const sqlReplyBy =
      replyby !== null ? `AND c2.createdBy IN (${replyby})` : '';
    const sqlRate = rate !== -1 ? `AND c.rate IN (${rate})` : '';
    const sqlIsReplied =
      isReplied !== null
        ? isReplied == 0
          ? 'AND c2.createdBy IS NULL'
          : isReplied == 1
          ? 'AND c2.createdBy IS NOT NULL'
          : 'AND c2.createdBy IS NOT NULL AND r.updated_at > c2.lastModified AND r.created_at < c2.lastModified'
        : '';
    const sqlTextLike =
      textLike !== '' ? `AND c.originalText LIKE "%${textLike}%"` : '';
    const rs = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM reviews r
      LEFT JOIN (SELECT * FROM comments WHERE type = 0) c ON c.reviewId = r.id
      LEFT JOIN (SELECT * FROM comments WHERE type = 1) c2 ON c2.reviewId = r.id
      LEFT JOIN (SELECT DISTINCT(review_id) FROM review_values ${sqlLabel}) rv2 ON rv2.review_id = r.id
      WHERE r.id != ""
      ${sqlLang} ${sqlRate} ${sqlReplyBy} ${sqlIsReplied} ${sqlTextLike} ${versionNameSql} ${sqlOs}`,
    );
    return parseInt(rs[0].total);
  }

  async countReview(condition: any) {
    return await this.reviewsRepository.countBy(condition);
  }

  async countComment(condition: any) {
    return await this.commentsRepository.countBy(condition);
  }

  async addReview(review: ReviewEntity) {
    return await this.reviewsRepository.insert(review);
  }

  async addComment(comment: CommentEntity) {
    return await this.commentsRepository.insert(comment);
  }

  async addLabel(label: LabelEntity) {
    return await this.labelsRepository.insert(label);
  }

  async addReviewValue(reviewValue: ReviewValueEntity) {
    return await this.reviewValuesRepository.insert(reviewValue);
  }

  async update(review: ReviewEntity) {
    return await this.reviewsRepository.save(review);
  }

  async updateLabel(label: LabelEntity) {
    return await this.labelsRepository.save(label);
  }

  async deleteReviewLabel(reviewId: string) {
    const date = new Date();
    return this.dataSource.query(
      `UPDATE review_values SET is_enable = 0, updated_at = ${Math.floor(
        date.getTime() / 1000,
      )} WHERE review_id = '${reviewId}'`,
    );
  }

  async updateComment(comment: CommentEntity) {
    return await this.commentsRepository.save(comment);
  }
}
