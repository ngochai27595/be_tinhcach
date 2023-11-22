import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Reviews as ReviewEntity } from './review.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { GooglApisService } from '../googleApis/googleApis.service';
import { AppstoreService } from '../curl/appstore.service';

const REVIEW_FIELD = {
  COMMENT_TITLE: '3',
};

const IOS_STATE_RESPONSE = {
  PUBLISHED: 1,
  PENDING_PUBLISH: 2,
};

@Controller('v2/reviews')
export class V2ReviewsController {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly httpService: HttpService,
    private service: ReviewsService,
    private googleApisService: GooglApisService,
    private appstoreService: AppstoreService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('labels')
  async getLabels(@Query() q: any) {
    const page = q?.page || 1;
    const size = q?.size || 10;
    const take: any = size > 100 ? 10 : size;
    const skip: any = (page - 1) * take;
    const total = await this.service.countLabel();
    const labels = await this.service.getLabels(skip, take);
    return { data: labels, total, page };
  }

  @UseGuards(JwtAuthGuard)
  @Get('reports')
  async getReports() {
    return await this.service.renderReport();
  }

  @Get('dev')
  async dev() {
    return await this.service.getCommentById('1');
  }

  // @UseGuards(JwtAuthGuard)
  @Get('reports/label')
  async getLabelReports(@Query() q: any) {
    const start = q?.start || '';
    const end = q?.end || '';
    return await this.service.renderLabelReport(start, end);
  }

  @UseGuards(JwtAuthGuard)
  @Put('labels/:id')
  async editLabel(@Param() params: any, @Body() body: any) {
    if (!body.name || !body.level) {
      return { status: false, msg: 'Thiếu tham số!' };
    }
    const label: any = await this.service.getLabelById(params.id);
    if (label) {
      const date = new Date();
      try {
        await this.service.updateLabel({
          ...label,
          name: body.name,
          level: body.level,
          updated_at: date.getTime() / 1000,
        });
        return {
          status: true,
          msg: 'Sửa nhãn thành công',
          data: { ...label, ...body, updated_at: date.getTime() / 1000 },
        };
      } catch (error) {
        return { status: false, msg: error };
      }
    } else {
      return { status: false, msg: 'Nhãn không tồn tại' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('labels')
  async addLabel(@Body() body: any) {
    if (!body.name || !body.level) {
      return { status: false, msg: 'Thiếu tham số!' };
    }
    const label: any = await this.service.getLabelByName(body.name);
    if (!label) {
      const date = new Date();
      try {
        const labelData = {
          id: uuidv4(),
          name: body.name,
          level: body.level,
          created_at: date.getTime() / 1000,
          updated_at: date.getTime() / 1000,
        };
        await this.service.addLabel(labelData);
        return { status: true, msg: 'Thanh cong!', data: labelData };
      } catch (error) {
        return { status: false, msg: error };
      }
    } else {
      return { status: false, msg: 'Đã tồn tại label!', data: label };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/labels')
  async getLabelOfReview(@Param() params: any) {
    const review: any = await this.service.getById(params.id);
    if (review) {
      try {
        const labels = await this.service.getReviewLabels({
          review_id: params.id,
          is_enable: 1,
        });
        return { status: true, data: labels };
      } catch (error) {
        return { status: false, msg: error };
      }
    } else {
      return { status: false, msg: 'Review không tồn tại' };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/labels')
  async editLabelOfReview(
    @Param() params: any,
    @Body() body: any,
    @Request() req,
  ) {
    const review: any = await this.service.getById(params.id);
    if (review) {
      try {
        await this.service.deleteReviewLabel(params.id);
        const reviewFieldLabelId = '1';
        const reviewFieldLabelLvl3Id = '2';
        body.labels.forEach((label: any) => {
          const date = new Date();
          this.service.addReviewValue({
            id: uuidv4(),
            review_id: params.id,
            field_id:
              label.level == 3 ? reviewFieldLabelLvl3Id : reviewFieldLabelId,
            value: label.id,
            is_enable: 1,
            createdBy: req.user.username,
            created_at: date.getTime() / 1000,
            updated_at: date.getTime() / 1000,
          });
        });
        return { status: true, msg: 'Thành công!' };
      } catch (error) {
        return { status: false, msg: error };
      }
    } else {
      return { status: false, msg: 'Review không tồn tại' };
    }
  }

  @Get('appstore-curls/response')
  async appstoreCurlReply(@Query() q: any) {
    const config = {
      packageName: q.package,
      id: q.id,
    };
    const resp: any = await this.appstoreService.curlReviewResponse(config);
    if (resp.status) {
      try {
        if (resp.data?.data) {
          const total = await this.service.countComment({
            reviewId: q.id,
            type: 1,
          });
          const date = new Date(resp.data.data?.attributes?.lastModifiedDate);
          if (total === 0) {
            await this.service.addComment({
              id: uuidv4(),
              reviewId: q.id,
              type: 1,
              lastModified: Math.floor(date.getTime() / 1000).toString(),
              text: resp.data.data?.attributes?.responseBody,
              reviewerLanguage: '',
              device: '',
              active: 1,
              osVerion: 0,
              appVersionCode:
                IOS_STATE_RESPONSE[resp.data.data?.attributes?.state],
              appVersionName: '',
              rate: 0,
              deviceMetadata: JSON.stringify({}),
              createdBy: '',
              originalText: resp.data.data?.attributes?.responseBody,
              enText: '',
            });
          } else {
            const commentOlds: any = await this.service.getComments({
              reviewId: q.id,
              type: 1,
            });
            if (commentOlds.length > 0) {
              this.service.updateComment({
                ...commentOlds[0],
                originalText: resp.data.data?.attributes?.responseBody,
                text: resp.data.data?.attributes?.responseBody,
                lastModified: Math.floor(date.getTime() / 1000),
                appVersionCode:
                  IOS_STATE_RESPONSE[resp.data.data?.attributes?.state],
              });
            }
          }
        } else {
          return { status: false, msg: 'Error !', code: -1 };
        }
        return resp.data;
      } catch (error) {
        return { status: false, msg: 'Error !', error };
      }
    } else {
      const date = new Date();
      await this.service.addComment({
        id: uuidv4(),
        reviewId: q.id,
        type: 1,
        lastModified: Math.floor(date.getTime() / 1000).toString(),
        text: 'Deleted',
        reviewerLanguage: '',
        device: '',
        active: 1,
        osVerion: 0,
        appVersionCode: 1,
        appVersionName: '',
        rate: 0,
        deviceMetadata: JSON.stringify({}),
        createdBy: '',
        originalText: 'Deleted',
        enText: '',
      });
      return { status: false, msg: 'Error !', code: -2 };
    }
  }

  @Get('appstore-curls/:id')
  async appstoreCurlReview(@Query() q: any, @Param() params: any) {
    const config = {
      packageName: q.package,
      id: params.id,
    };
    try {
      const resp: any = await this.appstoreService.curlReview(config);
      if (resp.status) {
        const totalReview = await this.service.countReview({
          id: params.id,
        });
        const review = resp.data.data;
        const date = new Date(review?.attributes?.createdDate);
        if (totalReview === 0) {
          await this.service.addReview({
            id: params.id,
            authorName: review.attributes.reviewerNickname,
            os: 'IOS',
            created_at: date.getTime() / 1000,
            updated_at: date.getTime() / 1000,
            packageName: config.packageName,
          });
        }
        const comments: any = await this.service.getComments({
          reviewId: params.id,
          type: 0,
        });
        if (comments.length === 0) {
          await this.service.addComment({
            id: uuidv4(),
            reviewId: params.id,
            type: 0,
            lastModified: (date.getTime() / 1000).toString(),
            text: review?.attributes?.body,
            reviewerLanguage: review?.attributes?.territory,
            device: '',
            osVerion: 0,
            active: 1,
            appVersionCode: 0,
            appVersionName: '',
            rate: review?.attributes?.rating,
            deviceMetadata: JSON.stringify({}),
            createdBy: '',
            originalText: review?.attributes?.body,
            enText: '',
          });
          await this.service.addReviewValue({
            id: uuidv4(),
            review_id: params.id,
            field_id: REVIEW_FIELD.COMMENT_TITLE,
            value: review?.attributes?.title,
            is_enable: 1,
            created_at: date.getTime() / 1000,
            updated_at: date.getTime() / 1000,
            createdBy: '',
          });
        } else {
          const comments: any = await this.service.getComments({
            reviewId: params.id,
            type: 0,
          });
          this.service.updateComment({
            ...comments[0],
            text: review?.attributes?.body,
            originalText: review?.attributes?.body,
          });
        }
        return resp;
      } else {
        return { status: false, msg: 'Error !' };
      }
    } catch (error) {
      return { status: false, msg: 'Error !', error };
    }
  }

  @Get('appstore-curls')
  async appstoreCurls(@Query() q: any) {
    const config = {
      packageName: q.package,
      url:
        q?.url ||
        'https://api.appstoreconnect.apple.com/v1/apps/1658687701/customerReviews?limit=100&sort=-createdDate',
    };
    const resp: any = await this.appstoreService.curlReviews(config);
    if (resp.status) {
      resp.data.data.map(async (review: any, index: any) => {
        const totalReview = await this.service.countReview({
          id: review.id,
        });
        const date = new Date(review?.attributes?.createdDate);
        if (totalReview === 0) {
          await this.service.addReview({
            id: review.id,
            authorName: review.attributes.reviewerNickname,
            os: 'IOS',
            created_at: date.getTime() / 1000,
            updated_at: date.getTime() / 1000,
            packageName: config.packageName,
          });
        }
        const totalCommon = await this.service.countComment({
          reviewId: review.id,
          type: 0,
        });
        if (totalCommon === 0) {
          await this.service.addComment({
            id: uuidv4(),
            reviewId: review.id,
            type: 0,
            lastModified: (date.getTime() / 1000).toString(),
            text: review?.attributes?.body,
            reviewerLanguage: review?.attributes?.territory,
            device: '',
            osVerion: 0,
            active: 1,
            appVersionCode: 0,
            appVersionName: '',
            rate: review?.attributes?.rating,
            deviceMetadata: JSON.stringify({}),
            createdBy: '',
            originalText: review?.attributes?.body,
            enText: '',
          });
          try {
            await this.service.addReviewValue({
              id: uuidv4(),
              review_id: review.id,
              field_id: REVIEW_FIELD.COMMENT_TITLE,
              value: review?.attributes?.title,
              is_enable: 1,
              created_at: date.getTime() / 1000,
              updated_at: date.getTime() / 1000,
              createdBy: '',
            });
          } catch (error) {}
        }
      });
      return {
        status: true,
        url: `http://localhost:3007/v2/reviews/appstore-curls?package=1658687701&url=${resp.data?.links?.next}`
          .replace('&limit', '%26limit')
          .replace('&sort', '%26sort'),
        data: resp.data,
      };
    } else {
      return { status: false, msg: 'Error !' };
    }
  }

  @Get('curls')
  async curls(@Query() q: any) {
    const config = {
      packageName: q.package,
      token: q?.token,
    };
    const resp: any = await this.googleApisService.curlV2Reviews(config);
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
                    text: data?.text,
                    reviewerLanguage: data?.reviewerLanguage,
                    device: data?.device,
                    active: 1,
                    osVerion: data?.androidOsVersion,
                    appVersionCode: data?.appVersionCode,
                    appVersionName: data?.appVersionName,
                    rate: data?.starRating,
                    deviceMetadata: JSON.stringify(data?.deviceMetadata || {}),
                    createdBy: '',
                    originalText: data?.originalText || data?.text,
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
                    text: data?.text,
                    lastModified: data?.lastModified?.seconds,
                    originalText: data?.originalText || data?.text,
                  });
                }
              }
            }
            if (comment.developerComment) {
              const data = comment.developerComment;
              const total = await this.service.countComment({
                reviewId: review.reviewId,
                type: 1,
              });
              if (total === 0) {
                try {
                  await this.service.addComment({
                    id: uuidv4(),
                    reviewId: review.reviewId,
                    type: 1,
                    lastModified: data?.lastModified?.seconds,
                    text: data?.text,
                    reviewerLanguage: data?.reviewerLanguage,
                    device: data?.device,
                    active: 0,
                    osVerion: data?.androidOsVersion,
                    appVersionCode: data?.appVersionCode,
                    appVersionName: data?.appVersionName,
                    rate: data?.starRating,
                    deviceMetadata: JSON.stringify(data?.deviceMetadata || {}),
                    createdBy: '',
                    originalText: data?.originalText || data?.text,
                    enText: '',
                  });
                } catch (error) {}
              } else {
                const commentOlds: any = await this.service.getComments({
                  reviewId: review.reviewId,
                  type: 1,
                });
                if (commentOlds.length > 0) {
                  try {
                    this.service.updateComment({
                      ...commentOlds[0],
                      rate: data?.starRating,
                      text: data?.text,
                      lastModified: data?.lastModified?.seconds,
                      originalText: data?.originalText || data?.text,
                    });
                  } catch (error) {}
                }
              }
            }
          });
        } catch (error) {}
      });
    }
    return {
      url: `http://localhost:3007/v2/reviews/curls?package=com.amanotes.gs.g06&token=${resp?.data?.tokenPagination?.nextPageToken}`,
      resp,
    };
  }

  @Get('curls/get-en-text')
  async getEnText() {
    const comment: any = await this.service.getCommentNotExistEnText();
    if (comment) {
      const review: any = await this.service.getById(comment.reviewId);
      const config = {
        packageName: review.packageName,
      };
      const reviewData: any = await this.googleApisService.curlV2Review(
        review.id,
        config,
        'en',
      );
      if (reviewData?.data) {
        reviewData.data.comments.map(async (c: any, index: number) => {
          if (c.userComment) {
            const data = c.userComment;
            try {
              this.service.updateComment({
                ...comment,
                enText: data?.text,
              });
            } catch (error) {}
          }
        });
      } else {
        this.service.updateComment({
          ...comment,
          enText: 'notfound',
        });
      }
      return { reviewData };
    } else {
      return -1;
    }
  }

  @Get('curls/:id')
  async curl(@Param() params: any) {
    const review: any = await this.service.getById(params.id);
    if (review) {
      const config = {
        packageName: review.packageName,
      };
      const reviewData: any = await this.googleApisService.curlV2Review(
        params.id,
        config,
        'vi',
      );
      if (reviewData) {
        try {
          reviewData.data.comments.map(async (comment: any, index: number) => {
            if (comment.userComment) {
              const data = comment.userComment;
              const total = await this.service.countComment({
                reviewId: params.id,
                type: 0,
              });
              if (review.updated_at != data?.lastModified?.seconds) {
                this.service.update({
                  ...review,
                  updated_at: data?.lastModified?.seconds,
                });
              }
              if (total === 0) {
                try {
                  await this.service.addComment({
                    id: uuidv4(),
                    reviewId: params.id,
                    type: 0,
                    lastModified: data?.lastModified?.seconds,
                    text: data?.text,
                    reviewerLanguage: data?.reviewerLanguage,
                    device: data?.device,
                    active: 1,
                    osVerion: data?.androidOsVersion,
                    appVersionCode: data?.appVersionCode,
                    appVersionName: data?.appVersionName,
                    rate: data?.starRating,
                    deviceMetadata: JSON.stringify(data?.deviceMetadata || {}),
                    createdBy: '',
                    originalText: data?.originalText || data?.text,
                    enText: '',
                  });
                } catch (error) {
                  console.log(error);
                }
              } else {
                const commentOlds: any = await this.service.getComments({
                  reviewId: params.id,
                  type: 0,
                });
                if (commentOlds.length > 0) {
                  try {
                    this.service.updateComment({
                      ...commentOlds[0],
                      rate: data?.starRating,
                      text: data?.text,
                      originalText: data?.originalText || data?.text,
                      lastModified: data?.lastModified?.seconds,
                    });
                  } catch (error) {}
                }
              }
            }
            if (comment.developerComment) {
              const data = comment.developerComment;
              const total = await this.service.countComment({
                reviewId: params.id,
                type: 1,
              });
              if (total === 0) {
                try {
                  await this.service.addComment({
                    id: uuidv4(),
                    reviewId: params.id,
                    type: 1,
                    active: 1,
                    lastModified: data?.lastModified?.seconds,
                    text: data?.text,
                    reviewerLanguage: data?.reviewerLanguage,
                    device: data?.device,
                    osVerion: data?.androidOsVersion,
                    appVersionCode: data?.appVersionCode,
                    appVersionName: data?.appVersionName,
                    rate: data?.starRating,
                    deviceMetadata: JSON.stringify(data?.deviceMetadata || {}),
                    createdBy: '',
                    originalText: data?.originalText || data?.text,
                    enText: '',
                  });
                } catch (error) {}
              } else {
                const commentOlds: any = await this.service.getComments({
                  reviewId: params.id,
                  type: 1,
                });
                if (commentOlds.length > 0) {
                  try {
                    this.service.updateComment({
                      ...commentOlds[0],
                      rate: data?.starRating,
                      text: data?.text,
                      originalText: data?.originalText || data?.text,
                      lastModified: data?.lastModified?.seconds,
                    });
                  } catch (error) {}
                }
              }
            }
          });
        } catch (error) {}
        return reviewData;
      } else {
        return -1;
      }
    } else {
      return -1;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('reply/:id')
  async reply(@Param() params: any, @Body() data: any, @Request() req) {
    try {
      if (!data.text) {
        return -1;
      }
      const review: any = await this.service.getById(params.id);
      if (review.os === 'IOS') {
        const comments: any = await this.service.getComments({
          reviewId: params.id,
          type: 1,
        });
        const config = {
          packageName: review.packageName,
          id: params.id,
          text: data.text,
        };
        await this.appstoreService.curlReplyReview(config);
        const date = new Date();
        if (comments.length === 0) {
          this.service.addComment({
            id: uuidv4(),
            reviewId: params.id,
            type: 1,
            lastModified: (date.getTime() / 1000).toString(),
            text: data.text,
            reviewerLanguage: '',
            device: '',
            osVerion: 0,
            appVersionCode: 0,
            active: 1,
            appVersionName: '',
            rate: 0,
            deviceMetadata: '',
            createdBy: req.user.username,
            originalText: data.text,
            enText: '',
          });
        } else {
          this.service.updateComment({
            ...comments[0],
            lastModified: (date.getTime() / 1000).toString(),
            text: data.text,
            originalText: data.text,
            createdBy: req.user.username,
          });
        }
        return;
      }
      if (review.os === 'Android') {
        const config = {
          packageName: review.packageName,
        };
        const resp: any = await this.googleApisService.curlV2ReplyReview(
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
              text: resp.data?.result?.replyText || data.text,
              reviewerLanguage: '',
              device: '',
              active: 1,
              osVerion: 0,
              appVersionCode: 0,
              appVersionName: '',
              rate: 0,
              deviceMetadata: '',
              createdBy: req.user.username,
              originalText: resp.data?.result?.replyText || data.text,
              enText: '',
            });
          } catch (error) {}
        } else {
          try {
            this.service.updateComment({
              ...comments[0],
              lastModified: resp.data?.result?.lastEdited?.seconds,
              text: resp.data?.result?.replyText || data.text,
              originalText: resp.data?.result?.replyText || data.text,
              createdBy: req.user.username,
            });
          } catch (error) {}
        }
        return resp;
      }
    } catch (error) {}
  }
}
