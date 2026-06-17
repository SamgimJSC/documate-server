import { CreateDocumentAlertDto } from '../dto/createDocumentAlert.dto';
import { UpdateDocumentAlertDto } from '../dto/updateDocumentAlert.dto';
import { DocumentAlert } from '../entities/document-alert.entity';

export interface DocumentAlertRepository {
  createAlert(dto: CreateDocumentAlertDto): Promise<DocumentAlert>;
  findByAlertId(alertId: string): Promise<DocumentAlert | null>;
  findByDocumentId(documentId: string): Promise<DocumentAlert[]>;
  findByUserId(userId: string): Promise<DocumentAlert[]>;
  findByDocumentIdAndOffsetType(
    documentId: string,
    offsetType: string,
  ): Promise<DocumentAlert | null>;
  findPendingAlerts(notifyDate: Date): Promise<DocumentAlert[]>;
  updateAlert(
    alertId: string,
    dto: UpdateDocumentAlertDto,
  ): Promise<DocumentAlert | null>;
  deleteAlert(alertId: string): Promise<boolean>;
}
