const MAX_BASE_LENGTH = 100;

export function sanitizeFileName(originalName: string): string {
  // 경로 조작 문자 제거: .. / \
  const stripped = originalName.replace(/\.\./g, '').replace(/[/\\]/g, '');

  const dotIndex = stripped.lastIndexOf('.');
  const base = dotIndex !== -1 ? stripped.slice(0, dotIndex) : stripped;
  const ext = dotIndex !== -1 ? stripped.slice(dotIndex).toLowerCase() : '';

  const safeBase = base
    .replace(/ /g, '_') // 공백 → _
    .replace(/[^\w가-힣.-]/g, ''); // 허용 외 문자 제거 (한글·영문·숫자·_·.·-)

  const truncated = safeBase.slice(0, MAX_BASE_LENGTH);

  return truncated + ext;
}
