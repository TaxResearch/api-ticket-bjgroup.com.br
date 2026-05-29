import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// Torna o PrismaService globalmente disponível
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Exporta para ser usado em outros módulos
})
export class PrismaModule {}
