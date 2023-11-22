import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
const { GoogleAuth } = require('google-auth-library');
const { dirname } = require('path');
const path = require('path');
const { google } = require('googleapis');
const appDir = dirname(require.main.filename);

@Injectable()
export class AppstoreService {
  constructor(private readonly httpService: HttpService) {}

  getAuthService = async (packageName: string) => {
    const targetAudience =
      'https://us-central1-amaplatform.cloudfunctions.net/getToken';

    const KEYFILEPATH = `${appDir}/${packageName}.json`;
    const auth = new GoogleAuth({
      keyFile: KEYFILEPATH,
    });
    const client = await auth.getIdTokenClient(targetAudience);
    const res = await client.request({ url: targetAudience });
    return res?.data?.token;
  };

  getAuthServiceV3 = async (packageName: string) => {
    const targetAudience =
      'https://us-central1-amaplatform.cloudfunctions.net/amanotesAppleProxy';

    const KEYFILEPATH = `${appDir}/${packageName}.json`;
    const auth = new google.auth.GoogleAuth({
      keyFile: path.resolve(__dirname, KEYFILEPATH),
    });
    const client = await auth.getIdTokenClient(targetAudience);
    return client;
  };

  getAuthServiceV2 = async (packageName: string) => {
    const targetAudience =
      'https://us-central1-amaplatform.cloudfunctions.net/amanotesAppleProxy';

    const KEYFILEPATH = `${appDir}/${packageName}.json`;
    const auth = new GoogleAuth({
      keyFile: KEYFILEPATH,
    });
    const client = await auth.getIdTokenClient(targetAudience);
    return client;
  };

  async curlReviewResponse(config: { packageName: string; id: string }) {
    try {
      const client = await this.getAuthServiceV3(config.packageName);
      const res = await client.request({
        url: `https://us-central1-amaplatform.cloudfunctions.net/amanotesAppleProxy/v1/customerReviews/${config.id}/response`,
        method: 'GET',
      });
      return { status: true, data: res.data };
    } catch (error) {
      return { status: false, error, config };
    }
  }

  async curlReview(config: { packageName: string; id: string }) {
    try {
      const client = await this.getAuthServiceV3(config.packageName);
      const res = await client.request({
        url: `https://us-central1-amaplatform.cloudfunctions.net/amanotesAppleProxy/v1/customerReviews/${config.id}`,
        method: 'GET',
      });
      return { status: true, data: res.data };
    } catch (error) {
      return { status: false, error, config };
    }
  }

  async curlReviews(config: { packageName: string; url: string }) {
    try {
      const token = await this.getAuthService(config.packageName);
      try {
        const headersRequest = {
          'Content-Type': 'application/json',
          Authorization: token,
        };
        const response: any = await this.httpService
          .get(config.url, {
            headers: headersRequest,
          })
          .toPromise();
        return { status: true, data: response.data };
      } catch (error) {
        return { status: false, error, config };
      }
    } catch (error) {
      return { status: false, error, config };
    }
  }

  async curlReplyReview(config: {
    packageName: string;
    text: string;
    id: string;
  }) {
    try {
      const client = await this.getAuthServiceV2(config.packageName);
      const res = await client.request({
        url: 'https://us-central1-amaplatform.cloudfunctions.net/amanotesAppleProxy/v1/customerReviewResponses',
        method: 'POST',
        data: {
          data: {
            attributes: { responseBody: config.text },
            relationships: {
              review: {
                data: {
                  id: config.id,
                  type: 'customerReviews',
                },
              },
            },
            type: 'customerReviewResponses',
          },
        },
      });

      return { status: true, data: res.data };
    } catch (error) {
      return { status: false, error, config };
    }
  }
}
