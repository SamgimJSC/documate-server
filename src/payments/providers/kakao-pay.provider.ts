import { Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import { TypedConfigService } from '../../configs/typedConfig.service';
import {
  KAKAOPAY_APPROVE_PATH,
  KAKAOPAY_DEFAULT_QUANTITY,
  KAKAOPAY_READY_PATH,
  KAKAOPAY_TAX_FREE_AMOUNT,
  PRO_PLAN_ITEM_NAME,
} from '../const/payment.const';

export interface KakaoPayReadyRequest {
  paymentId: string;
  userId: string;
  amount: number;
}

export interface KakaoPayReadyResponse {
  tid: string;
  next_redirect_app_url?: string;
  next_redirect_mobile_url?: string;
  next_redirect_pc_url?: string;
  android_app_scheme?: string;
  ios_app_scheme?: string;
  created_at?: string;
}

export interface KakaoPayApproveRequest {
  paymentId: string;
  userId: string;
  tid: string;
  pgToken: string;
}

export interface KakaoPayApproveResponse {
  aid: string;
  tid: string;
  cid: string;
  sid?: string;
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type?: string;
  item_name?: string;
  quantity?: number;
  created_at?: string;
  approved_at?: string;
}

@Injectable()
export class KakaoPayProvider {
  constructor(private readonly configService: TypedConfigService) {}

  async readySubscription(
    request: KakaoPayReadyRequest,
  ): Promise<KakaoPayReadyResponse> {
    const response = await axios.post<KakaoPayReadyResponse>(
      this.buildUrl(KAKAOPAY_READY_PATH),
      {
        cid: this.configService.get('KAKAOPAY_CID'),
        partner_order_id: request.paymentId,
        partner_user_id: request.userId,
        item_name: PRO_PLAN_ITEM_NAME,
        quantity: KAKAOPAY_DEFAULT_QUANTITY,
        total_amount: request.amount,
        tax_free_amount: KAKAOPAY_TAX_FREE_AMOUNT,
        approval_url: this.withPaymentId(
          this.configService.get('KAKAOPAY_APPROVAL_URL'),
          request.paymentId,
        ),
        cancel_url: this.withPaymentId(
          this.configService.get('KAKAOPAY_CANCEL_URL'),
          request.paymentId,
        ),
        fail_url: this.withPaymentId(
          this.configService.get('KAKAOPAY_FAIL_URL'),
          request.paymentId,
        ),
      },
      {
        headers: {
          Authorization: `SECRET_KEY ${this.configService.get(
            'KAKAOPAY_SECRET_KEY_DEV',
          )}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  async approveSubscription(
    request: KakaoPayApproveRequest,
  ): Promise<KakaoPayApproveResponse> {
    const response = await axios.post<KakaoPayApproveResponse>(
      this.buildUrl(KAKAOPAY_APPROVE_PATH),
      {
        cid: this.configService.get('KAKAOPAY_CID'),
        tid: request.tid,
        partner_order_id: request.paymentId,
        partner_user_id: request.userId,
        pg_token: request.pgToken,
      },
      {
        headers: {
          Authorization: `SECRET_KEY ${this.configService.get(
            'KAKAOPAY_SECRET_KEY_DEV',
          )}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return response.data;
  }

  getFailureMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      const message = this.stringifyKakaoError(error.response?.data);
      return message || error.message;
    }

    return error instanceof Error ? error.message : String(error);
  }

  private buildUrl(path: string): string {
    return `${this.configService.get('KAKAOPAY_API_HOST')}${path}`;
  }

  private withPaymentId(url: string, paymentId: string): string {
    const parsed = new URL(url);
    parsed.searchParams.set('paymentId', paymentId);
    return parsed.toString();
  }

  private stringifyKakaoError(data: unknown): string {
    if (!data) return '';
    if (typeof data === 'string') return data;

    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }
}
