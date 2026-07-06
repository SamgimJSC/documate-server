export type DocumentUnlockPayload = {
  sub: string; // userId uuid
  documentId: string;
  purpose: 'document-unlock';
  iat?: number;
  exp?: number;
};
