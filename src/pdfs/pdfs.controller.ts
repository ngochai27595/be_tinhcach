import { Controller, Get, Query, Param, Post, Body, Put } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Not } from 'typeorm';
import { Pdfs as PdfEntity } from './pdf.entity';
import { PdfsService } from './pdfs.service';
import { GooglApisService } from '../googleApis/googleApis.service';
import { drive } from 'googleapis/build/src/apis/drive';
const fs = require('fs');

@Controller('pdfs')
export class PdfsController {
  constructor(
    @InjectRepository(PdfEntity)
    private readonly httpService: HttpService,
    private service: PdfsService,
    private googleApisService: GooglApisService,
  ) {}

  @Get()
  get(@Query() q: any) {
    let condition: any = { title: Not('') };
    const page = q?.page || 1;
    if (q?.idCategory !== undefined) {
      condition = { ...condition, id_category: q?.idCategory };
    }
    if (q?.drive !== undefined) {
      condition = { ...condition, drive: q?.drive };
    }
    if (q?.source !== undefined) {
      condition = { ...condition, source: q?.source };
    }
    if (q?.isCrawl === undefined) {
      condition = { ...condition, status: 1 };
    }
    const take: any = 18;
    const skip: any = (page - 1) * take;
    let select: any = [
      'id',
      'title',
      'page',
      'thumb',
      'file_type',
      'status',
      'id_source',
    ];
    let order: any = { created_at: 'DESC' };
    if (q.source == 'tailieu') {
      select = ['id', 'title', 'file_url', 'file_type', 'page'];
      order = { id_source: 'DESC' };
      if (q?.orderPage !== undefined) {
        order = { page: 'DESC' };
      }
    }
    if (q.source == 'dtv') {
      select = ['id', 'title', 'file_url', 'file_type', 'page'];
      order = { created_at: 'ASC' };
      condition = { ...condition, file_url: Like('%google.com%') };
    }
    return this.service.get(condition, skip, take, select, order);
  }

  @Get('save-file')
  async saveFileToanMath(@Query() q: any): Promise<any> {
    const skip: number = 0;
    const take: number = 0;
    const select: any = ['id', 'title', 'file_url'];
    const pdfExist = await this.service.get(
      {
        status: 0,
        source: q.source,
      },
      skip,
      take,
      select,
    );
    if (pdfExist.length !== 0) {
      const pdf: any = pdfExist[0];
      const headersRequest = {
        'Content-Type': 'application/json',
        Accept: 'application/pdf',
      };
      const response = await this.httpService
        .get(pdf.file_url, {
          headers: headersRequest,
          responseType: 'arraybuffer',
        })
        .toPromise();

      fs.writeFileSync('public/' + pdf.title + '.pdf', response.data);

      const data = await this.service.update({ ...pdf, status: 1 });
      return { status: true, msg: 'Thành công!', data };
    } else {
      return { status: false };
    }
  }

  @Get('curl-drive-tailieu')
  async curlGoogleDriveTailieu() {
    try {
      const pdf: any = await this.service.getById('2');
      const drives: any = await this.googleApisService.curlFileInfolder(
        {
          tokenPath: 'crawlToken',
          clientPath: 'crawlClient',
        },
        {
          c: pdf.drive,
          p: pdf.title,
        },
      );
      const rs = await Promise.all(
        drives.map(async (d: any) => {
          const status: any = await this.googleApisService.curlChangeParent(
            {
              tokenPath: 'crawlToken',
              clientPath: 'crawlClient',
            },
            {
              c: pdf.drive,
              p: pdf.title,
              id: d.id,
            },
          );
          const pdfExist: any = await this.service.getOneByCondition({
            drive: d.name,
          });
          if (pdfExist) {
            await this.service.update({ ...pdfExist, status: 1, drive: d.id });
            await this.googleApisService.curlChangeName(
              {
                tokenPath: 'crawlToken',
                clientPath: 'crawlClient',
              },
              {
                c: pdf.drive,
                p: pdf.title,
                id: d.id,
                name: pdfExist.id,
              },
            );
          }
          return { ...d, ...status };
        }),
      );
      return rs;
    } catch (error) {
      return -1;
    }
  }

  @Get('curl-toan-math')
  async curlToanMath(@Query() q: any) {
    const data = await this.service.curlToanMath(q.y, q.m, q.page, q.domain);
    const rs = await Promise.all(
      data.map(async (d: any) => {
        const fileInfo = await this.service.curlToanMathFile(d.url);
        if (fileInfo.status) {
          const totalPdf = await this.service.countV2({ title: d.title });
          if (totalPdf === 0) {
            const rs = await this.service.add({
              ...d,
              file_url: fileInfo.data,
            });
            return { ...d, file_url: fileInfo.data, status: true };
          } else {
            return { ...d, file_url: fileInfo.data };
          }
        } else {
          return { ...d, file_url: '' };
        }
      }),
    );
    return rs;
  }

  @Get('curl-thi247')
  async curlThi247(@Query() q: any) {
    const data = await this.service.curlThi247(q.type, q.url);

    const rs = await Promise.all(
      data.map(async (d: any) => {
        const fileInfo = await this.service.curlThi247File(d.url);
        if (fileInfo.status) {
          const totalPdf = await this.service.count({ title: d.title });
          if (totalPdf === 0) {
            await this.service.add({
              ...d,
              file_url: fileInfo.data,
            });
            return { ...d, file_url: fileInfo.data, status: true };
          } else {
            return { ...d, file_url: fileInfo.data };
          }
        } else {
          return { ...d, file_url: '' };
        }
      }),
    );
    return rs;
  }

  @Get('curl-dtv')
  async curlDtv(@Query() q: any) {
    const data = await this.service.curlDtv(q.url);
    const pdfs: any = [];

    await Promise.all(
      data.map(async (d: any, index: any) => {
        const urlArray: any = d.url.split('_');
        const idSource: string = urlArray[urlArray.length - 1];
        const id_source = parseInt(idSource.substring(0, idSource.length - 5));
        const fileInfo = await this.service.curlDtvFile(
          `https://www.dtv-ebook.com/ta-va-hoang-th_${id_source}.html`,
        );
        await Promise.all(
          fileInfo.map(async (f: any) => {
            const pdf: any = {
              id: uuidv4(),
              source: 'dtv',
              title: d.title + '-' + f.title,
              file_url: f.file.substring(0, 254),
              id_source,
              created_at: Math.floor(Date.now() / 1000),
            };
            const totalPdf = await this.service.count({ title: pdf.title });
            if (totalPdf === 0) {
              try {
                await this.service.add(pdf);
              } catch (error) {
                console.log(error);
              }
            }
            pdfs.push(pdf);
          }),
        );
      }),
    );
    return pdfs;
  }

  @Get('curl-tailieu')
  async curlTailieu(@Query() q: any) {
    let start: any = parseInt(q.start ? q.start : 1);
    const end: any = parseInt(q.end ? q.end : 100000000);
    const skip: number = 0;
    const take: number = 0;
    const select: any = ['id', 'file_url'];
    const order: any = { file_url: 'DESC' };
    const pdfExist = await this.service.get(
      {
        source: 'tailieu',
      },
      skip,
      take,
      select,
      order,
    );
    if (pdfExist.length !== 0 && start === 1) {
      start = parseInt(pdfExist[0].file_url) + 1;
    }

    let data: any = [];

    for (let index = start; index <= end; index++) {
      data.push({ file_url: index });
    }
    console.log(data);

    const rs = await Promise.all(
      data.map(async (d: any) => {
        const fileInfo = await this.service.curlTailieu(d.file_url);
        console.log(fileInfo);
        if (fileInfo.status) {
          return { ...d, ...fileInfo.data };
        } else {
          return { ...d, file_url: '' };
        }
      }),
    );

    return rs;
  }

  @Get('curl-tailieu-ver2')
  async curlTailieuV2(@Query() q: any) {
    let start: any = parseInt(q.start ? q.start : 1);
    const end: any = parseInt(q.end ? q.end : 100000000);
    let data: any = [];
    let i = 0;

    for (let index = end; index >= start; index--) {
      i++;
      setTimeout(() => {
        console.log('this.service', this.service.curlTailieu);
        this.service.curlTailieu(index);
      }, 500 * i);
    }

    return data;
  }

  @Get('update-thumb')
  async updateThumb() {
    const rs = this.service.updateThumb();
    return rs;
  }

  @Get(':id')
  getById(@Param() params: any) {
    return this.service.getById(params.id);
  }

  @Get(':id/detail')
  async getDetailById(@Param() params: any) {
    const pdf = await this.service.getById(params.id);

    let condition: any = { status: 1 };
    const take: any = 10;
    const skip: any = Math.floor(Math.random() * 1000);
    let select: any = ['id', 'title', 'page', 'thumb', 'file_type', 'status'];
    let order: any = { created_at: 'DESC' };
    const pdfs = await this.service.get(condition, skip, take, select, order);

    return { ...pdf, pdfs };
  }

  @Put(':id')
  async update(@Param() params: any, @Body() pdf: PdfEntity) {
    const pdfData: PdfEntity = await this.service.getById(params.id);
    if (pdfData) {
      const data = await this.service.update({
        ...pdfData,
        ...pdf,
        created_at: '' + Math.floor(Date.now() / 1000),
      });
      return { status: true, msg: 'Thành công!', data };
    } else {
      return { status: false, msg: 'Không tồn tài!', data: { id: params.id } };
    }
  }

  @Post()
  async create(@Body() pdf: PdfEntity) {
    const data: PdfEntity = {
      ...pdf,
      id: uuidv4(),
      created_at: Math.floor(Date.now() / 1000).toString(),
    };
    const totalPdf = await this.service.count({ title: pdf.title });
    if (totalPdf === 0) {
      const rs = await this.service.add(data);
      const pdfAdd = await this.service.getById(rs?.identifiers[0]?.id);
      return { status: true, msg: 'Thành công!', data: pdfAdd };
    } else {
      const rs = await this.service.get({ title: pdf.title });
      return { status: false, msg: 'Đã tồn tài!', data: rs[0] };
    }
  }
}
