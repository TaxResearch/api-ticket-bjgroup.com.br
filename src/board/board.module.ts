import { Module } from '@nestjs/common';
import { BoardService } from './board.service';
import { BoardController } from './board.controller';
// PrismaModule já é global, não precisa importar aqui

@Module({
  controllers: [BoardController],
  providers: [BoardService],
  // Não precisa importar PrismaService pois PrismaModule é global
})
export class BoardModule {}
