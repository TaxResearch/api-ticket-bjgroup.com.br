import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { EmailModule } from '../email/email.module';
import { PusherModule } from '../pusher/pusher.module';
import { DiscordModule } from '../discord/discord.module';
import { DevTeamGuard } from '../auth/dev-team.guard';

@Module({
  imports: [EmailModule, PusherModule, DiscordModule],
  controllers: [TaskController],
  providers: [TaskService, DevTeamGuard],
})
export class TaskModule {}
