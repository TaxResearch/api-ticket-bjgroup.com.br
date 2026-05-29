import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(private prisma: PrismaService) {}

  // Encontra um usuário pelo ID
  async findOneById(id: number): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    return user;
  }

  // Encontra um usuário pelo email
  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async updateSettings(
    userId: number,
    settings: UpdateUserSettingsDto,
  ): Promise<Omit<User, 'password'>> {
    // Verifica se o usuário existe
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      throw new NotFoundException(`Usuário com ID ${userId} não encontrado.`);
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: settings,
      });

      // Remove a senha do retorno
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = updatedUser;
      return result;
    } catch (error) {
      this.logger.error(
        `Erro ao atualizar configurações do usuário ${userId}`,
        error,
      );
      throw new InternalServerErrorException(
        'Não foi possível salvar as configurações.',
      );
    }
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }
}
