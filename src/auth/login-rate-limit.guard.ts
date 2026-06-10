import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

/**
 * Rate limit simples em memória para /auth (login/signup): trava brute force.
 * Janela deslizante por IP+rota. Single-instance — suficiente p/ esta API.
 */
@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private hits = new Map<string, number[]>();
  private readonly windowMs = 15 * 60 * 1000; // 15 min
  private readonly max = 10; // tentativas por janela

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const fwd = req.headers?.['x-forwarded-for'];
    const ip = (
      (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0] ||
      req.ip ||
      'unknown'
    ).trim();
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const recent = (this.hits.get(key) || []).filter(
      (t) => now - t < this.windowMs,
    );
    if (recent.length >= this.max) {
      throw new HttpException(
        'Muitas tentativas. Tente novamente em alguns minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(key, recent);

    // Limpeza leve para o Map não crescer indefinidamente.
    if (this.hits.size > 5000) this.hits.clear();
    return true;
  }
}
