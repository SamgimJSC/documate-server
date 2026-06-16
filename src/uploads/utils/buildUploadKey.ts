import { UploadTarget } from '../../global/constants/uploadTarget.enum';
import { sanitizeFileName } from './sanitizeFileName';

const TARGET_PREFIX: Record<UploadTarget, string> = {
  [UploadTarget.DOCUMENT]: 'd',
  [UploadTarget.RECEIPT]: 'r',
  [UploadTarget.TEMP]: 't',
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function formatTimestamp(d: Date): string {
  return `${formatDate(d)}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function randomSixDigits(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

export function buildUploadKey(
  userId: string,
  targetType: UploadTarget,
  originalName: string,
): string {
  const now = new Date();
  const prefix = TARGET_PREFIX[targetType];
  const dateStr = formatDate(now);
  const tsStr = formatTimestamp(now);
  const random = randomSixDigits();
  const safeName = sanitizeFileName(originalName);

  // uploads/{userId}/{d|r}/{yyyyMMdd}/{random}_{yyyyMMddHHmmss}_{safeFileName}
  return `uploads/${userId}/${prefix}/${dateStr}/${random}_${tsStr}_${safeName}`;
}
