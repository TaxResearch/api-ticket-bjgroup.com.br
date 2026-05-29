import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  footer?: { text: string };
  timestamp?: string;
}

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  constructor(private readonly httpService: HttpService) {}

  async sendEmbed(webhookUrl: string, embed: DiscordEmbed): Promise<void> {
    if (!webhookUrl) return;

    try {
      await lastValueFrom(
        this.httpService.post(webhookUrl, {
          username: 'DevDeck Bot',
          avatar_url: 'https://i.imgur.com/8Fk7t7D.png',
          embeds: [embed],
        }),
      );
      this.logger.log('Notificação (embed) enviada para o Discord com sucesso.');
    } catch (error) {
      this.logger.error(
        `Falha ao enviar notificação para o Discord: ${error.message}`,
      );
    }
  }

  async sendNotification(webhookUrl: string, content: string): Promise<void> {
    if (!webhookUrl) return;

    try {
      await lastValueFrom(
        this.httpService.post(webhookUrl, {
          content,
          username: 'DevDeck Bot',
          avatar_url: 'https://i.imgur.com/8Fk7t7D.png',
        }),
      );
      this.logger.log('Notificação enviada para o Discord com sucesso.');
    } catch (error) {
      this.logger.error(
        `Falha ao enviar notificação para o Discord: ${error.message}`,
      );
    }
  }
}
