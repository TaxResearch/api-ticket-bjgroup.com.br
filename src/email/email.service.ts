/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true'; // Converte string para boolean
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !port || !user || !pass) {
      this.logger.error(
        'Credenciais SMTP não configuradas corretamente no .env!',
      );
      // Decide se quer lançar um erro ou apenas não inicializar o transporter
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: secure, // true for 465, false for other ports (like 587 TLS)
      auth: {
        user: user, // Usuário SMTP
        pass: pass, // Senha SMTP ou Chave de API
      },
    });

    this.logger.log(`Email transporter configurado para host: ${host}`);
  }

  async sendEmail(to: string, subject: string, text: string, html?: string) {
    if (!this.transporter) {
      this.logger.warn(
        'Transportador de e-mail não inicializado. Verifique as configurações SMTP no .env. E-mail não enviado.',
      );
      return; // Não envia se a configuração falhou
    }

    const mailFrom =
      this.configService.get<string>('EMAIL_FROM') ||
      `"DevDeck" <noreply@devdeck.com>`;

    try {
      const info = await this.transporter.sendMail({
        from: mailFrom,
        to: to,
        subject: subject,
        text: text,
        html: html || `<p>${text.replace(/\n/g, '<br>')}</p>`,
      });

      this.logger.log(`Mensagem enviada para ${to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(
        `Erro ao enviar e-mail para ${to} usando ${this.configService.get('SMTP_HOST')}`,
        error,
      );
    }
  }
}
