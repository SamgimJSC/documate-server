import { rFileNameSpace, rFileNameUnsafe } from '../../global/reg';

const MAX_BASE_LENGTH = 100;

export function sanitizeFileName(originalName: string): string {
  const stripped = originalName.replace(/\.\./g, '').replace(/[/\\]/g, '');

  const dotIndex = stripped.lastIndexOf('.');
  const base = dotIndex !== -1 ? stripped.slice(0, dotIndex) : stripped;
  const ext = dotIndex !== -1 ? stripped.slice(dotIndex).toLowerCase() : '';

  const safeBase = base
    .replace(rFileNameSpace, '_')
    .replace(rFileNameUnsafe, '');

  const truncated = safeBase.slice(0, MAX_BASE_LENGTH);

  return truncated + ext;
}
