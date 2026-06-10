import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS restrito à(s) origem(ns) do front. A API só é chamada de
  // ticket.bjgroup.com.br (inclusive o widget, que abre ticket.php em iframe na
  // mesma origem). Configurável via CORS_ORIGINS (lista separada por vírgula).
  const corsOrigins = (
    process.env.CORS_ORIGINS ||
    'https://ticket.bjgroup.com.br,https://devdeck.okcarro.com.br,http://localhost:8000,http://localhost:3000'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: false, // auth é via Bearer header, não cookie
  });

  // Habilita validação global usando class-validator e class-transformer
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove propriedades não definidas no DTO
      transform: true, // Transforma o payload para instâncias do DTO
      forbidNonWhitelisted: true, // Lança erro se propriedades extras forem enviadas
    }),
  );

  // Define um prefixo global para todas as rotas da API (opcional)
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;

  try {
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}/api`);
    console.log(`WebSocket is running on ws://localhost:${port}`);
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

bootstrap().catch((err) => {
  console.error('Erro fatal na inicialização:', err);
  process.exit(1);
});
