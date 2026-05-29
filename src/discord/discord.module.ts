import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DiscordService } from './discord.service';

@Module({
  imports: [HttpModule],
  providers: [DiscordService],
  exports: [DiscordService], // Exportamos para usar no NotificationService
})
export class DiscordModule {}
