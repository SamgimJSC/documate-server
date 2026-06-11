import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MonthlyReport } from '../entities/monthly-report.entity';
import {
  MonthlyReportRepository,
  UpsertMonthlyReportDto,
} from './monthly-report.interface';

@Injectable()
export class TypeOrmMonthlyReportRepository implements MonthlyReportRepository {
  constructor(
    @InjectRepository(MonthlyReport)
    private readonly repo: Repository<MonthlyReport>,
  ) {}

  async upsertReport(dto: UpsertMonthlyReportDto): Promise<MonthlyReport> {
    const existing = await this.findByUserIdAndPeriod(
      dto.userId,
      dto.reportYear,
      dto.reportMonth,
    );

    if (existing) {
      Object.assign(existing, dto);
      return this.repo.save(existing);
    }

    const report = this.repo.create(dto);
    return this.repo.save(report);
  }

  async findByUserId(userId: string): Promise<MonthlyReport[]> {
    return this.repo.find({
      where: { userId },
      order: { reportYear: 'DESC', reportMonth: 'DESC' },
    });
  }

  async findByUserIdAndPeriod(
    userId: string,
    reportYear: number,
    reportMonth: number,
  ): Promise<MonthlyReport | null> {
    return this.repo.findOne({ where: { userId, reportYear, reportMonth } });
  }
}
