import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsService } from './reviews.service';
import { GooglApisService } from '../googleApis/googleApis.service';
import { UsersService } from '../users/users.service';
import { AppstoreService } from '../curl/appstore.service';
import { ReviewsController } from './reviews.controller';
import { V2ReviewsController } from './v2.reviews.controller';
import { Reviews as ReviewEntity } from './review.entity';
import { Users as UserEntity } from '../users/user.entity';
import { UserPermisions as UserPermisionEntity } from '../permisions/userPermisions.entity';
import { Comments as CommentEntity } from './comment.entity';
import { Labels as LabelEntity } from './label.entity';
import { ReviewValues as ReviewValueEntity } from './review.values.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReviewEntity,
      CommentEntity,
      LabelEntity,
      ReviewValueEntity,
      UserEntity,
      UserPermisionEntity,
    ]),
    HttpModule,
  ],
  providers: [ReviewsService, GooglApisService, UsersService, AppstoreService],
  controllers: [ReviewsController, V2ReviewsController],
})
export class ReviewsModule {}
