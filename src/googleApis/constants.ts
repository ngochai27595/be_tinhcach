export const SCOPES_GOOGLE_DRIVE = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/drive.appdata',
];

export const SCOPES_GOOGLE_ANDROID = [
  'https://www.googleapis.com/auth/androidpublisher',
];

export const SCOPES_GOOGLE_MAIL = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly',
];

export const GMAIL_URLS = {
  LIST: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
  SEND: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
  SEND2: 'https://content-gmail.googleapis.com/gmail/v1/users/me/messages/send',
};
