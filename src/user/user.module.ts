import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { DevTeamGuard } from '../auth/dev-team.guard';

@Module({
  providers: [UserService, DevTeamGuard],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
