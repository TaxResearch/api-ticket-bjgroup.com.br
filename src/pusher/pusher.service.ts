/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import * as Pusher from 'pusher';

@Injectable()
export class PusherService {
  private pusher: Pusher;

  constructor() {
    this.pusher = new Pusher({
      appId: '2068385',
      key: 'c4f7fea1d37fea1c1c73',
      secret: 'fbbf9c225f9d67c9504f',
      cluster: 'us2',
      useTLS: true,
    });
  }

  trigger(channel: string, event: string, data: object): void {
    this.pusher.trigger(channel, event, data).catch((err: unknown) => {
      console.error('Pusher trigger failed:', err);
    });
  }
}
