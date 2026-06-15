import { FileType } from '../../global/constants/fileType.enum';

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
] as const;

export const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

export const MIME_TO_FILE_TYPE: Record<string, FileType> = {
  'application/pdf': FileType.PDF,
  'image/jpeg': FileType.JPG,
  'image/png': FileType.PNG,
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
