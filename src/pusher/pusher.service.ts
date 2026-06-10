import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Pusher from 'pusher';

@Injectable()
export class PusherService {
  private pusher: Pusher;

  constructor(private readonly config: ConfigService) {
    this.pusher = new Pusher({
      appId: this.config.getOrThrow<string>('PUSHER_APP_ID'),
      key: this.config.getOrThrow<string>('PUSHER_KEY'),
      secret: this.config.getOrThrow<string>('PUSHER_SECRET'),
      cluster: this.config.getOrThrow<string>('PUSHER_CLUSTER'),
      useTLS: true,
    });
  }

  trigger(channel: string, event: string, data: object): void {
    this.pusher.trigger(channel, event, data).catch((err: unknown) => {
      console.error('Pusher trigger failed:', err);
    });
  }
}
