// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) // Valida o DTO
  async signup(@Body() createUserDto: CreateUserDto) {
    return this.authService.signup(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK) // Retorna 200 OK no login
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) // Valida o DTO
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  // Endpoint de teste (opcional, para verificar autenticação depois)
  // @UseGuards(JwtAuthGuard) // Protege esta rota
  // @Get('profile')
  // getProfile(@Req() req) {
  //   return req.user; // Retorna os dados do usuário do token
  // }
}
