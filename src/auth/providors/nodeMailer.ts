import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';
import { SendEmailOption, SendAlertEmailOption } from '../types/nodeMailer.type';
import { TypedConfigService } from '../../configs/typedConfig.service';

@Injectable()
export class NodeMailer {
  constructor(private readonly configService: TypedConfigService) {}

  async sendEmail(options: SendEmailOption) {
    const { to, subject, code } = options;

    console.log(this.configService.get('NODE_MAILER_PASS'));

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('NODE_MAILER_USER'),
        pass: this.configService.get('NODE_MAILER_PASS'),
      },
    });

    await transporter.sendMail({
      to,
      from: `"No Reply" <${this.configService.get('EMAIL')}>`,
      subject,
      html: this.createEmailTemplate(code),
    });
  }

  async sendAlertEmail(options: SendAlertEmailOption) {
    const { to, subject, html } = options;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('NODE_MAILER_USER'),
        pass: this.configService.get('NODE_MAILER_PASS'),
      },
    });

    await transporter.sendMail({
      to,
      from: `"DocuMate" <${this.configService.get('EMAIL')}>`,
      subject,
      html,
    });
  }

  buildAlertEmailHtml(
    title: string,
    reason: string | null,
    notifyDate: Date,
    documentId: string,
  ): string {
    const webUrl = this.configService.get('WEB_URL');
    const docUrl = `${webUrl}/documents/${documentId}`;
    const dateStr = new Date(notifyDate).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const reasonRow = reason
      ? `<tr>
          <td style="font-size:13px;color:#6b7280;width:90px;vertical-align:top;">알림 사유</td>
          <td style="font-size:13px;color:#111827;">${reason}</td>
        </tr>`
      : '';

    const templatePath = path.join(__dirname, 'alert-notification.html');
    return fs.readFileSync(templatePath, 'utf-8')
      .replace('{{TITLE}}', title)
      .replace('{{NOTIFY_DATE}}', dateStr)
      .replace('{{REASON_ROW}}', reasonRow)
      .replace('{{DOC_URL}}', docUrl);
  }

  private createEmailTemplate(code: string): string {
    const templatePath = path.join(__dirname, 'email-verification.html');
    let template = fs.readFileSync(templatePath, 'utf-8');

    const digits = code.padEnd(6, ' ').split('');

    template = template
      .replace('{{VERIFICATION_CODE}}', code)
      .replace('{{CODE_1}}', digits[0])
      .replace('{{CODE_2}}', digits[1])
      .replace('{{CODE_3}}', digits[2])
      .replace('{{CODE_4}}', digits[3])
      .replace('{{CODE_5}}', digits[4])
      .replace('{{CODE_6}}', digits[5]);

    return template;
  }
}
