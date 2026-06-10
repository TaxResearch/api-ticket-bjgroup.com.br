/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Pusher from 'pusher';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('pusher')
export class PusherAuthController {
  private pusher: Pusher;

  constructor(private configService: ConfigService) {
    this.pusher = new Pusher({
      appId: this.configService.getOrThrow<string>('PUSHER_APP_ID'),
      key: this.configService.getOrThrow<string>('PUSHER_KEY'),
      secret: this.configService.getOrThrow<string>('PUSHER_SECRET'),
      cluster: this.configService.getOrThrow<string>('PUSHER_CLUSTER'),
      useTLS: true,
    });
  }

  @Post('auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  authenticateUser(
    @Req() req,
    @Body('socket_id') socketId: string,
    @Body('channel_name') channelName: string,
  ) {
    if (!socketId || !channelName) {
      throw new BadRequestException(
        'socket_id e channel_name são obrigatórios',
      );
    }

    const userId = req.user.userId;
    const expectedChannel = `private-user-${userId}`;

    // Verificar se o usuário está tentando acessar seu próprio canal
    if (channelName !== expectedChannel) {
      throw new BadRequestException('Acesso negado a este canal');
    }

    // Autenticar o canal privado
    const authResponse = this.pusher.authorizeChannel(socketId, channelName, {
      user_id: userId.toString(),
      user_info: {
        email: req.user.email,
        name: req.user.name,
      },
    });

    return authResponse;
  }
}
