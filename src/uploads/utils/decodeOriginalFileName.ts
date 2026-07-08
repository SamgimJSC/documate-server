/**
 * Multer(busboy)는 multipart Content-Disposition 헤더를 latin1로 디코딩하는데,
 * 브라우저는 파일명을 UTF-8 바이트로 보내기 때문에 비-ASCII(한글 등) 파일명이
 * 깨진 채로 들어온다. latin1로 잘못 해석된 바이트를 되돌려 utf8로 재해석한다.
 */
export function decodeOriginalFileName(originalName: string): string {
  return Buffer.from(originalName, 'latin1').toString('utf8');
}
