import { FileType } from '../../global/constants/fileType.enum';
import { UploadTarget } from '../../global/constants/uploadTarget.enum';

export interface UploadedFileResult {
  /** 접근 URL — CloudFront 또는 S3 direct. 버킷이 private이면 S3 direct URL은 브라우저에서 접근 불가 */
  fileUrl: string;
  /** S3 object key — DB 저장 및 후속 OCR/AI 처리 시 S3 파일 참조에 재사용 */
  fileKey: string;
  fileName: string;
  fileType: FileType;
  fileSizeBytes: string;
  mimeType: string;
  targetType: UploadTarget;
}
