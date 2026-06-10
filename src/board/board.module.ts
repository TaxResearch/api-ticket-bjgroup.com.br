import { Module } from '@nestjs/common';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
import { DevTeamGuard } from '../auth/dev-team.guard';
// PrismaModule já é global, não precisa importar aqui

@Module({
  controllers: [BoardController],
  providers: [BoardService, DevTeamGuard],
  // Não precisa importar PrismaService pois PrismaModule é global
})
export class BoardModule {}
