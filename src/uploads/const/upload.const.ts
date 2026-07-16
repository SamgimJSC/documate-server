import { FileType } from '../../global/constants/fileType.enum';
import { DOCUMENT_MAX_FILES_PER_DOCUMENT } from '../../global/constants/document-limit.const';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

export const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

export const MIME_TO_FILE_TYPE: Record<string, FileType> = {
  'image/jpeg': FileType.JPG,
  'image/png': FileType.PNG,
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const IMAGE_ONLY_MIME_TYPES = ['image/jpeg', 'image/png'] as const;
export const IMAGE_ONLY_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);

export const MAX_TEMP_FILES_PER_DOCUMENT = DOCUMENT_MAX_FILES_PER_DOCUMENT;

// AI 분석이 이 시간(분) 넘게 PENDING(큐에서 못 꺼내감)이면 FAILED 로 간주한다.
export const TEMP_DOCUMENT_PENDING_TIMEOUT_MINUTES = 3;
// AI 분석이 이 시간(분) 넘게 PROCESSING(워커가 처리 중)이면 FAILED 로 간주한다.
export const TEMP_DOCUMENT_PROCESSING_TIMEOUT_MINUTES = 10;
