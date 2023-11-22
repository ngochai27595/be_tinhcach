import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Reviews as ReviewEntity } from './review.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { UsersService } from '../users/users.service';
import { GooglApisService } from '../googleApis/googleApis.service';

@Controller('reviews')
export class ReviewsController {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly httpService: HttpService,
    private service: ReviewsService,
    private googleApisService: GooglApisService,
    private userService: UsersService,
  ) {}

  @Get('develop')
  async develop() {
    const config = {
      packageName: 'com.amanotes.gs.g06',
      token: undefined,
    };
    return this.googleApisService.curlV2Reviews(config);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async gets(@Query() q: any, @Request() req) {
    const page = q?.page || 1;
    const size = q?.size || 10;
    const language = q?.language || '';
    const os = q?.os || '';
    const label = q?.labels || '';
    const versionName = q?.versionname || '';
    const replyby = q?.replyby || null;
    let isReplied = q?.isreplied || null;
    const rate = q?.rate || -1;
    const textLike = q?.textlike || '';
    const take: any = size > 100 ? 10 : size;
    const skip: any = (page - 1) * take;

    const permisions = await this.userService.getPermisionOfUser(
      req.user.userId,
    );

    const hourDisables = [0, 23, 22, 21, 20, 19, 18, 17];
    const dayDisables = [0, 6];

    if (permisions.findIndex((p: any) => p.role.includes('_ADMIN') || p.role == "YO_SUPPER_REVIEW") == -1) {
      const d = new Date();
      const hour = d.getHours();
      const day = d.getDay();
      if (hourDisables.findIndex(h => h == hour) != -1 || dayDisables.findIndex(d => d == day) != -1) {
        isReplied = 1;
      }
    }

    const total = await this.service.countSpecial(
      replyby,
      rate,
      language,
      os,
      label,
      isReplied,
      textLike,
      versionName,
    );
    const reviews = await this.service.get(
      replyby,
      rate,
      language,
      os,
      label,
      isReplied,
      textLike,
      versionName,
      skip,
      take,
    );
    return { data: reviews, total, page };
  }

  @UseGuards(JwtAuthGuard)
  @Get('options')
  async getOptions() {
    const authors = await this.service.getReplyAuthors();
    const languages = await this.service.getLanguages();
    const versionNames = await this.service.getAppVersionNames();
    const labels = await this.service.getLabels(0, 100);
    return { authors, languages, versionNames, labels };
  }

  @Get('curls')
  async curls() {
    const config = {
      packageName: 'com.os.fruitmasterpro',
      tokenPath: 'com.os.fruitmasterproToken',
      clientPath: 'com.os.fruitmasterproClient',
    };
    const resp: any = await this.googleApisService.curlReviews(config);
    if (resp.status) {
      resp.data.reviews.map(async (review: any, index: number) => {
        const totalReview = await this.service.countReview({
          id: review.reviewId,
        });
        try {
          review.comments.map(async (comment: any, index: number) => {
            if (comment.userComment) {
              const data = comment.userComment;
              const total = await this.service.countComment({
                reviewId: review.reviewId,
                type: 0,
              });
              if (totalReview === 0) {
                await this.service.addReview({
                  id: review.reviewId,
                  authorName: review.authorName,
                  os: 'Android',
                  created_at: data?.lastModified?.seconds,
                  updated_at: data?.lastModified?.seconds,
                  packageName: config.packageName,
                });
              } else {
                const reviewOld: any = await this.service.getById(
                  review.reviewId,
                );
                if (reviewOld.updated_at != data?.lastModified?.seconds) {
                  this.service.update({
                    ...reviewOld,
                    updated_at: data?.lastModified?.seconds,
                  });
                }
              }
              if (total === 0) {
                try {
                  await this.service.addComment({
                    id: uuidv4(),
                    reviewId: review.reviewId,
                    type: 0,
                    lastModified: data?.lastModified?.seconds,
                    text: data?.text.replace(/[\u0800-\uFFFF]/g, '').trim(),
                    reviewerLanguage: data?.reviewerLanguage,
                    device: data?.device,
                    osVerion: data?.androidOsVersion,
                    appVersionCode: data?.appVersionCode,
                    appVersionName: data?.appVersionName,
                    rate: data?.starRating,
                    active: 1,
                    deviceMetadata: JSON.stringify(data?.deviceMetadata),
                    createdBy: '',
                    originalText: '',
                    enText: '',
                  });
                } catch (error) {}
              } else {
                const commentOlds: any = await this.service.getComments({
                  reviewId: review.reviewId,
                  type: 0,
                });
                if (
                  commentOlds.length > 0 &&
                  commentOlds[0].lastModified != data?.lastModified?.seconds
                ) {
                  this.service.updateComment({
                    ...commentOlds[0],
                    rate: data?.starRating,
                    text: data?.text.replace(/[\u0800-\uFFFF]/g, '').trim(),
                    lastModified: data?.lastModified?.seconds,
                  });
                }
              }
            }
            if (comment.developerComment) {
              const total = await this.service.countComment({
                reviewId: review.reviewId,
                type: 1,
              });
              if (total === 0) {
                const data = comment.developerComment;
                try {
                  await this.service.addComment({
                    id: uuidv4(),
                    reviewId: review.reviewId,
                    type: 1,
                    lastModified: data?.lastModified?.seconds,
                    text: data?.text.replace(/[\u0800-\uFFFF]/g, '').trim(),
                    reviewerLanguage: data?.reviewerLanguage,
                    device: data?.device,
                    active: 1,
                    osVerion: data?.androidOsVersion,
                    appVersionCode: data?.appVersionCode,
                    appVersionName: data?.appVersionName,
                    rate: data?.starRating,
                    deviceMetadata: JSON.stringify(data?.deviceMetadata),
                    createdBy: '',
                    originalText: '',
                    enText: '',
                  });
                } catch (error) {}
              }
            }
          });
        } catch (error) {}
      });
    }
    return resp;
  }

  @Get('curls/get-token')
  curlGetToken() {
    const config = {
      tokenPath: 'gmailToken',
      clientPath: 'gmailClient',
    };
    return this.googleApisService.curlGetUrlToken(config);
  }

  @Get('curls/set-token')
  curlSetToken(@Query() q: any) {
    const config = {
      tokenPath: 'anhlh',
      clientPath: 'crawlClient',
    };
    return this.googleApisService.curlSetToken(config, q.code);
  }

  @Get('curls/:id')
  curl(@Param() params: any) {
    const config = {
      packageName: 'com.os.fruitmasterpro',
      tokenPath: 'com.os.fruitmasterproToken',
      clientPath: 'com.os.fruitmasterproClient',
    };
    return this.googleApisService.curlReview(params.id, config, 'vi');
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@Param() params: any) {
    const review: any = await this.service.getById(params.id);
    const comments = await this.service.getComments({ reviewId: params.id });
    return { ...review, comments };
  }

  @UseGuards(JwtAuthGuard)
  @Post('reply/:id')
  async reply(@Param() params: any, @Body() data: any, @Request() req) {
    if (!data.text) {
      return -1;
    }
    const review: any = await this.service.getById(params.id);
    const config = {
      packageName: review.packageName,
      tokenPath: `${review.packageName}Token`,
      clientPath: `${review.packageName}Client`,
    };
    const resp: any = await this.googleApisService.curlReplyReview(
      params.id,
      config,
      data.text,
    );
    const comments: any = await this.service.getComments({
      reviewId: params.id,
      type: 1,
    });
    if (comments.length === 0) {
      try {
        this.service.addComment({
          id: uuidv4(),
          reviewId: params.id,
          type: 1,
          lastModified: resp.data?.result?.lastEdited?.seconds,
          text: resp.data?.result?.replyText,
          reviewerLanguage: '',
          device: '',
          osVerion: 0,
          active: 1,
          appVersionCode: 0,
          appVersionName: '',
          rate: 0,
          deviceMetadata: '',
          createdBy: req.user.username,
          originalText: '',
          enText: '',
        });
      } catch (error) {}
    } else {
      try {
        if (params.id == '1') {
          this.service.updateComment({
            ...comments[0],
            text: data.text,
            createdBy: req.user.username,
          });
        } else {
          this.service.updateComment({
            ...comments[0],
            lastModified: resp.data?.result?.lastEdited?.seconds,
            text: resp.data?.result?.replyText,
            createdBy: req.user.username,
          });
        }
      } catch (error) {}
    }
    return resp;
  }
}
