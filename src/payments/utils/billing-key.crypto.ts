import * as crypto from 'crypto';
import { BILLING_KEY_CRYPTO_VERSION } from '../const/payment.const';

const AES_256_GCM_ALGORITHM = 'aes-256-gcm';
const GCM_IV_BYTES = 12;
const BILLING_KEY_PART_SEPARATOR = ':';

export function encryptBillingKey(plainText: string, secret: string): string {
  const iv = crypto.randomBytes(GCM_IV_BYTES);
  const cipher = crypto.createCipheriv(
    AES_256_GCM_ALGORITHM,
    deriveKey(secret),
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    BILLING_KEY_CRYPTO_VERSION,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(BILLING_KEY_PART_SEPARATOR);
}

export function decryptBillingKey(encryptedValue: string, secret: string): string {
  const [version, ivText, authTagText, cipherText] = encryptedValue.split(
    BILLING_KEY_PART_SEPARATOR,
  );

  if (
    version !== BILLING_KEY_CRYPTO_VERSION ||
    !ivText ||
    !authTagText ||
    !cipherText
  ) {
    throw new Error('Invalid encrypted billing key format.');
  }

  const decipher = crypto.createDecipheriv(
    AES_256_GCM_ALGORITHM,
    deriveKey(secret),
    Buffer.from(ivText, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(authTagText, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherText, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

function deriveKey(secret: string): Buffer {
  return crypto.createHash('sha256').update(secret).digest();
}
