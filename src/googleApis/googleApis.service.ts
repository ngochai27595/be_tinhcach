import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

const fs = require('fs').promises;
const { google } = require('googleapis');
const { dirname } = require('path');
var androidpublisher = google.androidpublisher('v3');
const appDir = dirname(require.main.filename);
import {
  GMAIL_URLS,
  SCOPES_GOOGLE_ANDROID,
  SCOPES_GOOGLE_MAIL,
} from './constants';
@Injectable()
export class GooglApisService {
  constructor(private readonly httpService: HttpService) {}

  getAuthService = (packageName: string) => {
    const KEYFILEPATH = `${appDir}/${packageName}.json`;
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES_GOOGLE_ANDROID,
    });
    return auth;
  };

  getAuthServiceGmail = (packageName: string) => {
    const KEYFILEPATH = `${appDir}/${packageName}.json`;
    const auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES_GOOGLE_MAIL,
    });
    return auth;
  };

  setAccessToken = async (
    credentials: any,
    code: string,
    tokenPath: string,
  ) => {
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0],
    );
    const token: string = await oAuth2Client.getToken(code);
    fs.writeFile(`${tokenPath}.json`, JSON.stringify(token), (err: any) => {
      if (err) return console.error(err);
    });
    return `Token stored to: ${tokenPath}.json`;
  };

  getUrlToken = (credentials: any) => {
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0],
    );
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES_GOOGLE_MAIL,
    });
    return authUrl;
  };

  authorize = async (credentials: any, tokenPath: string) => {
    const { client_secret, client_id, redirect_uris } = credentials.web;
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0],
    );
    try {
      const token = await fs.readFile(`${appDir}/${tokenPath}.json`);
      oAuth2Client.setCredentials(JSON.parse(token));
      return { status: true, oAuth2Client };
    } catch (error) {
      return { status: false, oAuth2Client };
    }
  };

  getReviewFromGoogle = async (auth: any, packageName: string, params: any) => {
    try {
      const resp = await androidpublisher.reviews.get({
        auth,
        packageName,
        reviewId: params.reviewId,
        translationLanguage: params.translationLanguage,
      });
      return { status: true, data: resp.data };
    } catch (error) {
      return { status: false, error };
    }
  };

  getGmails = async (auth: any) => {
    try {
      const gmail = google.gmail({ version: 'v1', auth });
      const mails = await gmail.users.messages.list({
        userId: 'me',
      });
      return { mails: mails.data };
    } catch (error) {
      return { status: false, error };
    }
  };

  sendGmails = async (auth: any, msg: string) => {
    try {
      const gmail = google.gmail({ version: 'v1', auth });
      const message = `From: KES <anhlh011190@gmail.com> 
To: linhdao3008@gmail.com, cristiano14021997@gmail.com, luuhien97@gmail.com, anhlh011199@gmail.com, anhlh@clevai.edu.vn 
Subject: KES ALERT!!! 

${msg}`;
      let buff = new Buffer(message);
      let raw = buff.toString('base64');
      const mails = await gmail.users.messages.send({
        userId: 'me',
        resource: {
          raw,
        },
      });
      return { mails: mails.data };
    } catch (error) {
      return { status: false, error };
    }
  };

  getReviewsFromGoogle = async (
    auth: any,
    packageName: string,
    token: any = undefined,
  ) => {
    try {
      const resp = await androidpublisher.reviews.list({
        auth,
        packageName,
        maxResults: 100,
        translationLanguage: 'vi',
        token,
      });
      return { status: true, data: resp.data };
    } catch (error) {
      return { status: false, error };
    }
  };

  replyReviewGoogle = async (auth: any, packageName: string, params: any) => {
    try {
      const resp = await androidpublisher.reviews.reply({
        auth,
        packageName: packageName,
        reviewId: params.reviewId,
        requestBody: { replyText: params.text },
      });
      return { status: true, data: resp.data };
    } catch (error) {
      return { status: false };
    }
  };

  changeFileName = async (
    auth: any,
    params: { c: string; p: string; id: string; name: string },
  ) => {
    try {
      const drive = google.drive({ version: 'v3', auth });
      const resp = await drive.files.update({
        fileId: params.id,
        resource: { name: params.name },
      });
      return resp.status;
    } catch (error) {
      return -1;
    }
  };

  changeFileParent = async (
    auth: any,
    params: { c: string; p: string; id: string },
  ) => {
    try {
      const drive = google.drive({ version: 'v3', auth });
      const resp = await drive.files.update({
        fileId: params.id,
        removeParents: params.p,
        addParents: params.c,
      });
      return resp.status;
    } catch (error) {
      return -1;
    }
  };

  getFilesFromGoogleDrive = async (
    auth: any,
    params: { c: string; p: string },
  ) => {
    try {
      const drive = google.drive({ version: 'v3', auth });
      let pId = params.p;
      let cId = params.c;
      const resp = await drive.files.list({
        pageSize: 10,
        fields: 'nextPageToken, files(id, name, mimeType)',
        q: "'" + pId + "' in parents",
      });
      return resp.data.files.filter((f: any) => f.id != cId);
    } catch (error) {
      return [];
    }
  };

  async curlSetToken(
    config: { tokenPath: string; clientPath: string },
    code: string,
  ) {
    try {
      const content = await fs.readFile(`${appDir}/${config.clientPath}.json`);
      const rsToken = await this.setAccessToken(
        JSON.parse(content),
        code,
        config.tokenPath,
      );
      return `${rsToken}`;
    } catch (error) {
      return { status: false, msg: 'Unauthorized' };
    }
  }

  async curlGetUrlToken(config: { tokenPath: string; clientPath: string }) {
    try {
      const content = await fs.readFile(`${appDir}/${config.clientPath}.json`);
      const authUrl = await this.getUrlToken(JSON.parse(content));
      return `<a href="${authUrl}">Bấm vào đây để cấp quyền</a>`;
    } catch (error) {
      return { status: -1, error };
    }
  }

  async curlV2ReplyReview(
    reviewId: any,
    config: {
      packageName: string;
    },
    text: string,
  ) {
    try {
      const auth = this.getAuthService(config.packageName);
      const replyyData = await this.replyReviewGoogle(
        auth,
        config.packageName,
        {
          reviewId,
          text,
        },
      );
      return replyyData;
    } catch (error) {
      return -1;
    }
  }

  async curlSendMail(msg: string) {
    try {
      const content = await fs.readFile(`${appDir}/gmailClient.json`);
      const auth = await this.authorize(JSON.parse(content), 'gmailToken');
      if (auth.status) {
        const gmail = await this.sendGmails(auth.oAuth2Client, msg);
        return { gmail };
      } else {
        return { status: false };
      }
    } catch (error) {
      return -1;
    }
  }

  async curlReplyReview(
    reviewId: any,
    config: {
      packageName: string;
      tokenPath: string;
      clientPath: string;
    },
    text: string,
  ) {
    try {
      const content = await fs.readFile(`${appDir}/${config.clientPath}.json`);
      const auth = await this.authorize(JSON.parse(content), config.tokenPath);
      if (auth.status) {
        const replyyData = await this.replyReviewGoogle(
          auth.oAuth2Client,
          config.packageName,
          {
            reviewId,
            text,
          },
        );
        return replyyData;
      } else {
        return 'Need get token';
      }
    } catch (error) {
      return -1;
    }
  }

  async curlV2Reviews(config: { packageName: string; token: any }) {
    try {
      const auth = this.getAuthService(config.packageName);
      const reviewData = await this.getReviewsFromGoogle(
        auth,
        config.packageName,
        config.token,
      );
      return reviewData;
    } catch (error) {
      return { status: false, error };
    }
  }

  async curlReviews(config: {
    packageName: string;
    tokenPath: string;
    clientPath: string;
  }) {
    try {
      const content = await fs.readFile(`${appDir}/${config.clientPath}.json`);
      const auth = await this.authorize(JSON.parse(content), config.tokenPath);
      if (auth.status) {
        const reviewData = await this.getReviewsFromGoogle(
          auth.oAuth2Client,
          config.packageName,
        );
        return reviewData;
      } else {
        return 'Need get token';
      }
    } catch (error) {
      return { status: false, error };
    }
  }

  async curlV2Review(
    reviewId: any,
    config: {
      packageName: string;
    },
    translationLanguage,
  ) {
    try {
      const auth = this.getAuthService(config.packageName);
      const reviewData = await this.getReviewFromGoogle(
        auth,
        config.packageName,
        {
          reviewId,
          translationLanguage,
        },
      );
      return reviewData;
    } catch (error) {
      return -1;
    }
  }

  async curlReview(
    reviewId: any,
    config: {
      packageName: string;
      tokenPath: string;
      clientPath: string;
    },
    translationLanguage: 'vi',
  ) {
    try {
      const content = await fs.readFile(`${appDir}/${config.clientPath}.json`);
      const auth = await this.authorize(JSON.parse(content), config.tokenPath);
      if (auth.status) {
        const reviewData = await this.getReviewFromGoogle(
          auth.oAuth2Client,
          config.packageName,
          {
            reviewId,
            translationLanguage,
          },
        );
        return reviewData;
      } else {
        return 'Need get token';
      }
    } catch (error) {
      return -1;
    }
  }

  async curlChangeName(
    config: { tokenPath: string; clientPath: string },
    params: { c: string; p: string; id: string; name: string },
  ) {
    try {
      const content = await fs.readFile(`${appDir}/${config.clientPath}.json`);
      const auth = await this.authorize(JSON.parse(content), config.tokenPath);
      if (auth.status) {
        const status = await this.changeFileName(auth.oAuth2Client, params);
        return { status };
      } else {
        return { status: false };
      }
    } catch (error) {
      return { status: false, error };
    }
  }

  async curlChangeParent(
    config: { tokenPath: string; clientPath: string },
    params: { c: string; p: string; id: string },
  ) {
    try {
      const content = await fs.readFile(`${appDir}/${config.clientPath}.json`);
      const auth = await this.authorize(JSON.parse(content), config.tokenPath);
      if (auth.status) {
        const status = await this.changeFileParent(auth.oAuth2Client, params);
        return { status };
      } else {
        return { status: false };
      }
    } catch (error) {
      return { status: false, error };
    }
  }

  async curlFileInfolder(
    config: { tokenPath: string; clientPath: string },
    params: { c: string; p: string },
  ) {
    try {
      const content = await fs.readFile(`${appDir}/${config.clientPath}.json`);
      const auth = await this.authorize(JSON.parse(content), config.tokenPath);
      if (auth.status) {
        const datas = await this.getFilesFromGoogleDrive(
          auth.oAuth2Client,
          params,
        );
        return datas;
      } else {
        return [];
      }
    } catch (error) {
      return [];
    }
  }
}
