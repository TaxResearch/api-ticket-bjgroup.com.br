import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { UserModule } from '../user/user.module';
import { EmailModule } from '../email/email.module';
import { DiscordModule } from 'src/discord/discord.module';
@Module({
  imports: [UserModule, EmailModule, DiscordModule],
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
