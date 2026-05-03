import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a string using AES-256-GCM.
 *
 * Uses a random IV per encryption — the same plaintext produces
 * different ciphertext each time (semantic security).
 *
 * Output format: base64(iv + authTag + ciphertext)
 */
export function encrypt(plaintext: string): string {
    const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    // Combine: iv (16 bytes) + authTag (16 bytes) + ciphertext
    const combined = Buffer.concat([iv, authTag, encrypted]);
    return combined.toString('base64');
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 *
 * Input format: base64(iv + authTag + ciphertext)
 * Throws if the data has been tampered with (auth tag verification).
 */
export function decrypt(encryptedBase64: string): string {
    const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
    const combined = Buffer.from(encryptedBase64, 'base64');

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
}
