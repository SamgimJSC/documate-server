export type SendEmailOption = {
  to: string;
  subject: string;
  code: string;
};

export type SendAlertEmailOption = {
  to: string;
  subject: string;
  html: string;
};
