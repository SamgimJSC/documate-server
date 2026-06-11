import { AlertOffsetType } from '../../global/constants/alertOffsetType.enum';

export class CreateDocumentAlertDto {
  documentId: string;
  userId: string;
  offsetType: AlertOffsetType;
  notifyDate: Date;
  reason?: string | null;
  channelEmail?: boolean;
  channelAppPush?: boolean;
  channelWebPush?: boolean;
}
