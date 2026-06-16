import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';

import { DocumentAlert } from '../entities/document-alert.entity';
import { DocumentAlertRepository } from './document-alert.interface';
import { CreateDocumentAlertDto } from '../dto/createDocumentAlert.dto';
import { UpdateDocumentAlertDto } from '../dto/updateDocumentAlert.dto';

@Injectable()
export class TypeOrmDocumentAlertRepository implements DocumentAlertRepository {
  constructor(
    @InjectRepository(DocumentAlert)
    private readonly repo: Repository<DocumentAlert>,
  ) {}

  async createAlert(dto: CreateDocumentAlertDto): Promise<DocumentAlert> {
    const alert = this.repo.create(dto);
    return this.repo.save(alert);
  }

  async findByAlertId(alertId: string): Promise<DocumentAlert | null> {
    return this.repo.findOne({ where: { alertId } });
  }

  async findByDocumentId(documentId: string): Promise<DocumentAlert[]> {
    return this.repo.find({ where: { documentId } });
  }

  async findByUserId(userId: string): Promise<DocumentAlert[]> {
    return this.repo.find({ where: { userId } });
  }

  async findByDocumentIdAndOffsetType(
    documentId: string,
    offsetType: string,
  ): Promise<DocumentAlert | null> {
    return this.repo.findOne({ where: { documentId, offsetType: offsetType as any } });
  }

  async findPendingAlerts(notifyDate: Date): Promise<DocumentAlert[]> {
    return this.repo.find({
      where: { isSent: false, notifyDate: LessThanOrEqual(notifyDate) },
    });
  }

  async updateAlert(
    alertId: string,
    dto: UpdateDocumentAlertDto,
  ): Promise<DocumentAlert | null> {
    const alert = await this.findByAlertId(alertId);
    if (!alert) return null;

    Object.assign(alert, dto);
    return this.repo.save(alert);
  }

  async deleteAlert(alertId: string): Promise<boolean> {
    const result = await this.repo.delete({ alertId });
    return (result.affected ?? 0) > 0;
  }
}
