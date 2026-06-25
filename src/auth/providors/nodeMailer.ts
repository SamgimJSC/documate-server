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

    return `
<!DOCTYPE html>
<html lang="ko">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- 헤더 -->
        <tr>
          <td style="background:#0f172a;padding:24px 32px;">
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">D <span style="color:#60a5fa;">DocuMate</span></span>
          </td>
        </tr>

        <!-- 본문 -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">문서 알림</p>
            <h1 style="margin:0 0 24px;color:#111827;font-size:22px;font-weight:700;line-height:1.3;">${title}</h1>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin-bottom:24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="color:#6b7280;font-size:13px;padding-bottom:10px;width:80px;">알림 날짜</td>
                      <td style="color:#111827;font-size:13px;font-weight:600;padding-bottom:10px;">${dateStr}</td>
                    </tr>
                    ${reason ? `
                    <tr>
                      <td style="color:#6b7280;font-size:13px;vertical-align:top;width:80px;">알림 사유</td>
                      <td style="color:#111827;font-size:13px;">${reason}</td>
                    </tr>` : ''}
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA 버튼 -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:8px;background:#0f172a;">
                  <a href="${docUrl}" target="_blank"
                    style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:-0.2px;">
                    문서 확인하기 →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- 푸터 -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #f3f4f6;">
            <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
              이 메일은 DocuMate 알림 설정에 의해 자동 발송되었습니다.<br>
              알림을 원하지 않으시면 문서 상세 페이지에서 알림을 삭제해주세요.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
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
