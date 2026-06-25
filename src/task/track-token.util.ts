import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Token de acompanhamento ("track") — prova que um e-mail foi vouched por um
 * painel da holding (que já autenticou o usuário na sua própria sessão).
 *
 * Formato: `<payload>.<sig>` onde
 *   payload = base64url("<email>|<exp_unix>")
 *   sig     = base64url(HMAC-SHA256(payload, WIDGET_TRACK_SECRET))
 *
 * O segredo é compartilhado entre o backend (.env WIDGET_TRACK_SECRET) e cada
 * painel que gera o token server-side. Sem o segredo não há como forjar o
 * e-mail de outra pessoa — é isso que torna a leitura por e-mail segura.
 */

function b64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(s: string): Buffer {
  let t = s.replace(/-/g, '+').replace(/_/g, '/');
  while (t.length % 4) t += '=';
  return Buffer.from(t, 'base64');
}

/** Gera um token (usado em testes / paridade com o gerador PHP do painel). */
export function signTrackToken(
  email: string,
  secret: string,
  ttlSeconds = 3600,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = b64url(
    Buffer.from(`${email.trim().toLowerCase()}|${exp}`, 'utf8'),
  );
  const sig = b64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

/**
 * Verifica o token e devolve o e-mail normalizado (minúsculo). Lança Error se a
 * assinatura não bate, o token expirou ou o e-mail é vazio/ inválido — o
 * chamador converte em ForbiddenException.
 */
export function verifyTrackToken(token: string, secret: string): string {
  if (!token || typeof token !== 'string') throw new Error('token ausente');
  const dot = token.indexOf('.');
  if (dot < 1) throw new Error('token malformado');

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = b64url(
    createHmac('sha256', secret).update(payload).digest(),
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('assinatura inválida');
  }

  const decoded = b64urlDecode(payload).toString('utf8');
  const sep = decoded.lastIndexOf('|');
  if (sep < 1) throw new Error('payload inválido');

  const email = decoded.slice(0, sep).trim().toLowerCase();
  const exp = parseInt(decoded.slice(sep + 1), 10);
  if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) {
    throw new Error('token expirado');
  }
  // Guarda crítica: e-mail vazio jamais pode "casar" com tickets sem e-mail.
  if (!email || !email.includes('@')) throw new Error('e-mail inválido');
  return email;
}
