import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts/decrypts sensitive strings (OAuth tokens) using AES-256-GCM.
 * Stored format: base64(iv):base64(authTag):base64(ciphertext)
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;
  private readonly logger = new Logger(CryptoService.name);

  constructor(private config: ConfigService) {
    const hexKey = config.get<string>('TOKEN_ENCRYPTION_KEY');
    if (!hexKey || hexKey.length !== 64) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('base64'), authTag.toString('base64'), encrypted.toString('base64')].join(':');
  }

  decrypt(stored: string): string {
    const [ivB64, authTagB64, ciphertextB64] = stored.split(':');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
  }
}
