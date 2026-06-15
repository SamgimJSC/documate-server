import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { TypedConfigService } from '../configs/typedConfig.service';
import { UploadTarget } from '../global/constants/uploadTarget.enum';
import { buildUploadKey } from './utils/buildUploadKey';
import { UploadedFileResult } from './types/uploadedFileResult.type';
import { EBadRequestException } from '../global/exceptions/EBadRequestException';
import { ERROR_CODE } from '../global/constants/errorCode.const';
import {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MIME_TO_FILE_TYPE,
} from './const/upload.const';

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cloudfrontUrl: string | undefined;

  constructor(private readonly configService: TypedConfigService) {
    this.region = this.configService.get('AWS_REGION');
    this.bucket = this.configService.get('AWS_S3_BUCKET_NAME');
    this.cloudfrontUrl = this.configService.get('AWS_CLOUDFRONT_URL');

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UploadedFileResult> {
    if (!file) {
      throw new EBadRequestException({
        message: '파일이 없습니다.',
        errorCode: ERROR_CODE.FILE_MISSING,
      });
    }

    if (
      !ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new EBadRequestException({
        message: '허용되지 않는 파일 형식입니다.',
        errorCode: ERROR_CODE.INVALID_FILE_TYPE,
      });
    }

    const dotIndex = file.originalname.lastIndexOf('.');
    const ext =
      dotIndex !== -1 ? file.originalname.slice(dotIndex).toLowerCase() : '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new EBadRequestException({
        message: '허용되지 않는 파일 확장자입니다.',
        errorCode: ERROR_CODE.INVALID_FILE_EXTENSION,
      });
    }

    const targetType = UploadTarget.TEMP;
    const fileKey = buildUploadKey(userId, targetType, file.originalname);

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const fileUrl = this.buildFileUrl(fileKey);

    return {
      fileUrl,
      fileKey,
      fileName: file.originalname,
      fileType: MIME_TO_FILE_TYPE[file.mimetype],
      fileSizeBytes: String(file.size),
      mimeType: file.mimetype,
      targetType,
    };
  }

  private buildFileUrl(fileKey: string): string {
    const encoded = encodeURI(fileKey);

    if (this.cloudfrontUrl) {
      return `${this.cloudfrontUrl}/${encoded}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encoded}`;
  }
}
