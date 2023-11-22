import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfsService } from './pdfs.service';
import { GooglApisService } from '../googleApis/googleApis.service';
import { PdfsController } from './pdfs.controller';
import { V2PdfsController } from './v2.pdfs.controller';
import { Pdfs as PdfEntity } from './pdf.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PdfEntity]), HttpModule],
  providers: [PdfsService, GooglApisService],
  controllers: [PdfsController, V2PdfsController],
})
export class PdfsModule {}
