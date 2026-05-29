import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module'; // Importa o PrismaModule
import { BoardModule } from './board/board.module';
import { TaskModule } from './task/task.module';
import { UserModule } from './user/user.module';
import { UserService } from './user/user.service';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { UserController } from './user/user.controller';
import { EmailModule } from './email/email.module';
import { EmailService } from './email/email.service';
import { NotificationModule } from './notification/notification.module';
import { NotificationService } from './notification/notification.service';
import { ConfigModule } from '@nestjs/config';
import { EncryptionModule } from './encryption/encryption.module';
import { EncryptionService } from './encryption/encryption.service';
import { PusherAuthController } from './pusher-auth/pusher-auth.controller';
import { ScheduleModule } from '@nestjs/schedule';
import { GroupModule } from './group/group.module';
import { DiscordModule } from './discord/discord.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    BoardModule,
    TaskModule,
    UserModule,
    AuthModule,
    EmailModule,
    NotificationModule,
    EncryptionModule,
    GroupModule,
    DiscordModule,
  ],
  controllers: [AuthController, UserController, PusherAuthController],
  providers: [
    UserService,
    AuthService,
    EmailService,
    NotificationService,
    EncryptionService,
  ],
})
export class AppModule {}
