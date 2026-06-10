import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Autorização por papel: libera só quem tem isDevTeam=true.
 * Usar SEMPRE depois do JwtAuthGuard (precisa de req.user.userId).
 * Resolve a separação dev × usuário do portal no backend (antes era só no front).
 */
@Injectable()
export class DevTeamGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.userId;
    if (!userId) {
      throw new ForbiddenException('Não autenticado.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isDevTeam: true },
    });
    if (!user?.isDevTeam) {
      throw new ForbiddenException(
        'Acesso restrito ao time de desenvolvimento.',
      );
    }
    return true;
  }
}
