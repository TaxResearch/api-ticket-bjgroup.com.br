import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    // Obtenha uma chave secreta FORTE do seu .env
    const key = this.configService.get<string>('ENCRYPTION_SECRET_KEY');
    if (!key || key.length < 32) {
      throw new Error(
        'ENCRYPTION_SECRET_KEY não definida ou muito curta no .env (mínimo 32 caracteres)',
      );
    }
    this.secretKey = key;
  }

  encrypt(text: string): string | null {
    if (!text) return null;
    try {
      return CryptoJS.AES.encrypt(text, this.secretKey).toString();
    } catch (error) {
      console.error('Erro ao criptografar:', error);
      return null; // Ou lance um erro
    }
  }

  decrypt(ciphertext: string): string | null {
    if (!ciphertext) return null;
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.secretKey);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      return originalText || null; // Retorna null se a descriptografia falhar
    } catch (error) {
      console.error('Erro ao descriptografar:', error);
      return null; // Ou lance um erro
    }
  }
}
