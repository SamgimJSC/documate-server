import { DocumentActivityType } from '../../global/constants/documentActivityType.enum';

export class CreateDocumentActivityDto {
  documentId: string;
  activityType: DocumentActivityType;
  description?: string | null;
}
