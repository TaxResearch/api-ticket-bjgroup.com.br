// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module'; // Importa UserModule
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

const JWT_SECRET =
  'sk_jwt_7x9A2qB8vR3tY6wE1zC5nM8pQ0sK3jH7gF4dL9oV2cX6rT1yU5iW8aB0eN3mZ7qP'; // SUBSTITUA POR UMA CHAVE SEGURA EM .env
const JWT_EXPIRATION = '24h'; // Ex: '60s', '60m', '24h', '7d'

@Module({
  imports: [
    UserModule, // Para ter acesso ao UserService
    PassportModule,
    JwtModule.register({
      secret: JWT_SECRET, // Use process.env.JWT_SECRET em produção
      signOptions: { expiresIn: JWT_EXPIRATION }, // Define tempo de expiração do token
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
