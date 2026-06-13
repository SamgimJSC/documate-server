import { BadRequestException, Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { TypedConfigService } from '../configs/typedConfig.service';
import { UploadTarget } from '../global/constants/uploadTarget.enum';
import { FileType } from '../global/constants/fileType.enum';
import { buildUploadKey } from './utils/buildUploadKey';
import { UploadedFileResult } from './types/uploadedFileResult.type';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

const MIME_TO_FILE_TYPE: Record<string, FileType> = {
  'application/pdf': FileType.PDF,
  'image/jpeg': FileType.JPG, // FileType에 JPEG 없음 → JPG로 통일
  'image/png': FileType.PNG,
};

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

    // S3Client는 서비스 초기화 시 한 번만 생성하여 재사용
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
    targetType: UploadTarget,
  ): Promise<UploadedFileResult> {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }

    if (
      !ALLOWED_MIME_TYPES.includes(
        file.mimetype as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException('허용되지 않는 파일 형식입니다.');
    }

    const dotIndex = file.originalname.lastIndexOf('.');
    const ext =
      dotIndex !== -1 ? file.originalname.slice(dotIndex).toLowerCase() : '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException('허용되지 않는 파일 확장자입니다.');
    }

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
    // 한글·공백 등이 포함된 key가 URL에서 깨지지 않도록 인코딩
    const encoded = encodeURI(fileKey);

    if (this.cloudfrontUrl) {
      return `${this.cloudfrontUrl}/${encoded}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encoded}`;
  }
}
