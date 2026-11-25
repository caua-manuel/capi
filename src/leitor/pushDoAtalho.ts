const CHAVE_DO_CODIGO = 'capi:codigo-do-aparelho';
const enderecoDaPonte = (import.meta.env.VITE_PONTE_APPLE_PAY_URL ?? '').trim();
const chavePublica = (import.meta.env.VITE_VAPID_CHAVE_PUBLICA ?? '').trim();

export function chavePublicaDoAtalho(): Uint8Array<ArrayBuffer> | null {
  try {
    const endereco = new URL(enderecoDaPonte);
    if (endereco.protocol !== 'https:' || !/^B[\w-]{86}$/.test(chavePublica)) return null;
    return Uint8Array.from(atob(chavePublica.replace(/-/g, '+').replace(/_/g, '/')), (byte) => byte.charCodeAt(0));
  } catch {
    return null;
  }
}

export function lerCodigoDoAparelho(): string | null {
  try {
    return localStorage.getItem(CHAVE_DO_CODIGO);
  } catch {
    return null;
  }
}

export function obterCodigoDoAparelho(): string {
  const salvo = lerCodigoDoAparelho();
  if (salvo) return salvo;

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const codigo = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  localStorage.setItem(CHAVE_DO_CODIGO, codigo);
  return codigo;
}

export async function enviarParaPonte(rota: 'inscrever' | 'teste', codigo: string, subscription?: PushSubscription): Promise<number> {
  const resposta = await fetch(new URL(`/${rota}`, enderecoDaPonte), {
    method: 'POST',
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo, subscription }),
  });
  return resposta.status;
}
