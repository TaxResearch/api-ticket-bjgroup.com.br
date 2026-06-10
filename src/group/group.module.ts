import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { DevTeamGuard } from '../auth/dev-team.guard';

@Module({
  providers: [GroupService, PrismaService, DevTeamGuard],
  controllers: [GroupController],
  exports: [GroupService],
})
export class GroupModule {}
