import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      // Opcional: Log das queries do Prisma
      // log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    // Conecta ao banco de dados quando o módulo inicia
    await this.$connect();
    console.log('Prisma connected successfully.');
  }

  async onModuleDestroy() {
    // Desconecta do banco de dados quando o módulo é destruído
    await this.$disconnect();
    console.log('Prisma disconnected.');
  }
}
