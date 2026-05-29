import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';

@Module({
  providers: [GroupService, PrismaService],
  controllers: [GroupController],
  exports: [GroupService],
})
export class GroupModule {}
