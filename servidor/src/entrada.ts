export interface Inscricao {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface Pagamento {
  valor: number;
  loja: string;
}

export interface Pendente {
  id: string;
  valor: string;
  loja: string;
}

export const ORIGEM_DO_APP = 'https://caua-manuel.github.io';
const TAMANHO_MAXIMO_DO_CORPO = 4096;
const CODIGO_DO_APARELHO = /^[\w-]{42}[AEIMQUYcgkosw048]$/;

export function objeto(dado: unknown): dado is Record<string, unknown> {
  return typeof dado === 'object' && dado !== null && !Array.isArray(dado);
}

export function codigoValido(dado: unknown): dado is string {
  return typeof dado === 'string' && CODIGO_DO_APARELHO.test(dado);
}

export async function lerCorpo(request: Request): Promise<unknown> {
  if (!request.body || request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return null;
  const leitor = request.body.getReader();
  const bytes = new Uint8Array(TAMANHO_MAXIMO_DO_CORPO);
  let tamanho = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    if (tamanho + value.length > bytes.length) {
      await leitor.cancel();
      return null;
    }
    bytes.set(value, tamanho);
    tamanho += value.length;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes.subarray(0, tamanho)));
  } catch {
    return null;
  }
}

export function lerInscricao(dado: unknown): Inscricao | null {
  if (!objeto(dado) || typeof dado.endpoint !== 'string' || !objeto(dado.keys)) return null;
  const { p256dh, auth } = dado.keys;
  if (typeof p256dh !== 'string' || !/^B[\w-]{85}[AEIMQUYcgkosw048]$/.test(p256dh)) return null;
  if (typeof auth !== 'string' || !/^[\w-]{21}[AQgw]$/.test(auth)) return null;

  const url = URL.parse(dado.endpoint);
  if (url?.protocol !== 'https:' || !url.hostname.endsWith('.push.apple.com')) return null;
  if (url.username || url.password || url.port || url.hash) return null;
  return { endpoint: url.href, keys: { p256dh, auth } };
}

export async function hashDoCodigo(codigo: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codigo));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function valorEmCentavos(dado: unknown): number | null {
  if (typeof dado !== 'string' && typeof dado !== 'number') return null;
  const bruto = String(dado);
  if (bruto.length > 30) return null;
  let texto = bruto.trim().replace(/^R\$\s*/i, '');
  if (typeof dado === 'string' && /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(texto)) {
    texto = texto.replace(/\./g, '');
  }
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(texto)) return null;
  const [inteiro, fracao = ''] = texto.split(/[.,]/);
  const valor = Number(inteiro) * 100 + Number(fracao.padEnd(2, '0'));
  return Number.isSafeInteger(valor) && valor > 0 ? valor : null;
}

export function lerPagamento(dado: unknown): Pagamento | null {
  if (!objeto(dado) || typeof dado.loja !== 'string' || dado.loja.length > 60) return null;
  const loja = dado.loja.replace(/\p{Bidi_Control}/gu, '').replace(/[\s\p{Cc}]+/gu, ' ').trim();
  const valor = valorEmCentavos(dado.valor);
  return valor !== null && loja ? { valor, loja } : null;
}

export function centavosParaTexto(valor: number, agrupar = false): string {
  const reais = Math.floor(valor / 100);
  return `${agrupar ? reais.toLocaleString('pt-BR') : reais},${String(valor % 100).padStart(2, '0')}`;
}
