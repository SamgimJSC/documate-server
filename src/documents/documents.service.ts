import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { AiAnalysisBodyDto } from './dto/aiAnalysisBody.dto';
import { OCR_QUEUE_KEY } from '../redis/redis.const';

@Injectable()
export class DocumentsService {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
  ) {}

  async enqueueAiAnalysis(aiAnalysisBodyDto: AiAnalysisBodyDto) {
    await this.redisClient.rpush(
      OCR_QUEUE_KEY,
      JSON.stringify(aiAnalysisBodyDto),
    );
  }
}
