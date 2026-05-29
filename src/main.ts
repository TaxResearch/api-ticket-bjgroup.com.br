import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita CORS para permitir requisições do frontend
  app.enableCors({
    origin: '*', // Em produção, restrinja para a origem do seu frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
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
