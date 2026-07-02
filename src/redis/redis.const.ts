export const OCR_QUEUE_KEY = 'ocr:queue';

// 카드 추천 작업 큐 (API 서버가 RPUSH, card-server 파이썬 워커가 BLPOP)
export const CARD_QUEUE_KEY = 'card:queue';
