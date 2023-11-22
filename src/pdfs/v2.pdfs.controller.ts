import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Pdfs as PdfEntity } from './pdf.entity';
import { PdfsService } from './pdfs.service';
import { GooglApisService } from '../googleApis/googleApis.service';

@Controller('v2/pdfs')
export class V2PdfsController {
  constructor(
    @InjectRepository(PdfEntity)
    private readonly httpService: HttpService,
    private service: PdfsService,
    private googleApisService: GooglApisService,
  ) {}

  @Get()
  get(@Query() q: any) {
    return this.service.getV2();
  }

  @Get('dev')
  dev(@Query() q: any) {
    return this.googleApisService.curlSendMail(
      'Có lớp vừa được tạo đấy!\nHello.',
    );
  }

  @Post('html2pdf')
  html2pdf2(@Body() body: { type: number; content: string }, @Res() res: any) {
    try {
      const html_to_pdf = require('html-pdf-node');
      const fs = require('fs');
      let options = { format: 'A4' };

      const file =
        body.type == 1
          ? {
              url: body.content,
            }
          : { content: body.content };

      html_to_pdf.generatePdf(file, options).then((pdfBuffer: any) => {
        let d = new Date();
        const pdfName = `${d.getTime()}.pdf`;

        fs.writeFile(pdfName, pdfBuffer, function (writeError: any) {
          if (writeError) {
            return -1;
          }

          fs.readFile(pdfName, function (readError, readData) {
            if (!readError && readData) {
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment');
              res.send(readData);
            }

            return -2;
          });
        });
      });
    } catch (error) {
      return -3;
    }
  }

  @Get('html2pdf')
  html2pdf(@Query() body: { type: number; content: string }, @Res() res: any) {
    try {
      const html_to_pdf = require('html-pdf-node');
      const fs = require('fs');
      let options = { format: 'A4' };

      const file =
        body.type == 1
          ? {
              url: body.content,
            }
          : { content: body.content };

      html_to_pdf.generatePdf(file, options).then((pdfBuffer: any) => {
        let d = new Date();
        const pdfName = `${d.getTime()}.pdf`;

        fs.writeFile(pdfName, pdfBuffer, function (writeError: any) {
          if (writeError) {
            return -1;
          }

          fs.readFile(pdfName, function (readError, readData) {
            if (!readError && readData) {
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment');
              res.send(readData);
            }

            return -2;
          });
        });
      });
    } catch (error) {
      return -3;
    }
  }

  @Get('tuvi')
  tuvi(@Query() body: { url: string, params: object }, @Res() res: any) {
    console.log("hain---curl--1-",body.url);
    // console.log("hain---curl--1-",JSON.parse(body.params));
    const axios = require("axios");

    let configCookie = {
      method: "get",
      url: "http://tuvichanco.vn/",
    };
  
    axios
      .request(configCookie)
      .then((response) => {
        const setCookie = response.headers["set-cookie"].toString();
        const data = setCookie.split(";");
        const cookie = data[0];
  
        const dataPage = JSON.stringify(response.data);
        const page = dataPage.split("g_token_key");
        const tokenKey = page[1].substring(5, 37);

        console.log("hainn--fecth tuvichanco--",tokenKey);

  
        let config = {
          method: "get",
          maxBodyLength: Infinity,
          url: body.url+"&tokenkey=" +
            tokenKey,
          headers: {
            Accept: "*/*",
            "Accept-Language":
              "en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7,fr-FR;q=0.6,fr;q=0.5",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            Cookie: cookie,
            Pragma: "no-cache",
            Referer: "http://tuvichanco.vn/",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
          },
        };
  
        axios
          .request(config)
          .then((response) => {
            console.log("hainn--response-",response);
            // res.send(JSON.stringify(response.data));
          })
          .catch((error) => {
            console.log("error1--",error);
            return -1;
          });
      })
      .catch((error) => {
        console.log("error2--",error);
        return -2;
      });
  }

  @Get('report')
  getReport(@Query() q: any) {
    const idSource = q?.idSource || 2560000;
    return this.service.getReport(idSource);
  }

  @Get('reportByDate')
  getReportByDate(@Query() q: any) {
    const start: any = q?.start || '2000-01-01';
    const end: any = q?.end || '3000-01-01';
    return this.service.getReportbyDate(start, end);
  }

  @Get('countByDate')
  countByDate(@Query() q: any) {
    return this.service.countbyDate();
  }
}
