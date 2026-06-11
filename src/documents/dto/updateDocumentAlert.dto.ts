import { AlertOffsetType } from '../../global/constants/alertOffsetType.enum';

export class UpdateDocumentAlertDto {
  offsetType?: AlertOffsetType;
  notifyDate?: Date;
  reason?: string | null;
  channelEmail?: boolean;
  channelAppPush?: boolean;
  channelWebPush?: boolean;
  isSent?: boolean;
  sentAt?: Date | null;
}
