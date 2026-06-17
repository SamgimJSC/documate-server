import { UploadTarget } from '../../global/constants/uploadTarget.enum';

const TARGET_PREFIX: Record<UploadTarget, string> = {
  [UploadTarget.DOCUMENT]: 'd',
  [UploadTarget.RECEIPT]: 'r',
  [UploadTarget.TEMP]: 't',
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatTimestamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function randomSixDigits(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}

function extractExt(originalName: string): string {
  const dotIndex = originalName.lastIndexOf('.');
  return dotIndex !== -1 ? originalName.slice(dotIndex).toLowerCase() : '';
}

export function buildUploadKey(
  userId: string,
  targetType: UploadTarget,
  originalName: string,
): string {
  const now = new Date();
  const prefix = TARGET_PREFIX[targetType];
  const tsStr = formatTimestamp(now);
  const random = randomSixDigits();
  const ext = extractExt(originalName);

  // uploads/{userId}/{d|r|t}/{랜덤6자리}_{yyyyMMddHHmmss}.확장자
  return `uploads/${userId}/${prefix}/${random}_${tsStr}${ext}`;
}
