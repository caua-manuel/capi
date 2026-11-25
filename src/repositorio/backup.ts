import { abrirBanco } from './banco';
import { gravarAjuste } from './ajustes';

/** Erro com mensagem pronta para a Tela mostrar. */
export class ErroDeBackup extends Error {}

const FORMATO = 'capi-backup';
const VERSAO = 1;
const ITERACOES = 250_000;
const STORES_COM_ID = ['lancamentos', 'categorias', 'fixos', 'metas', 'faturas'] as const;
const STORES_CHAVE_VALOR = ['ajustes', 'regras'] as const;

interface Conteudo {
  ajustes: [string, unknown][];
  regras: [string, string][];
  lancamentos: unknown[];
  categorias: unknown[];
  fixos: unknown[];
  metas: unknown[];
  faturas: unknown[];
}

interface ArquivoAberto { formato: typeof FORMATO; versao: number; cifrado: false; criadoEm: string; conteudo: Conteudo }
interface ArquivoCifrado { formato: typeof FORMATO; versao: number; cifrado: true; criadoEm: string; sal: string; iv: string; dados: string }

const paraBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const deBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

async function derivarChave(senha: string, sal: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: sal as BufferSource, iterations: ITERACOES, hash: 'SHA-256' },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

async function cifrar(texto: string, senha: string): Promise<Pick<ArquivoCifrado, 'sal' | 'iv' | 'dados'>> {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const chave = await derivarChave(senha, sal);
  const dados = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, new TextEncoder().encode(texto)));
  return { sal: paraBase64(sal), iv: paraBase64(iv), dados: paraBase64(dados) };
}

async function decifrar(a: ArquivoCifrado, senha: string): Promise<string> {
  try {
    const chave = await derivarChave(senha, deBase64(a.sal));
    const aberto = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(a.iv) as BufferSource }, chave, deBase64(a.dados) as BufferSource);
    return new TextDecoder().decode(aberto);
  } catch {
    throw new ErroDeBackup('Senha errada, ou o arquivo está danificado. Nada foi alterado.');
  }
}

async function lerConteudo(): Promise<Conteudo> {
  const db = await abrirBanco();
  const tx = db.transaction([...STORES_CHAVE_VALOR, ...STORES_COM_ID]);
  const chaveValor = async (nome: (typeof STORES_CHAVE_VALOR)[number]) => {
    const store = tx.objectStore(nome);
    const [chaves, valores] = await Promise.all([store.getAllKeys(), store.getAll()]);
    return chaves.map((c, i) => [String(c), valores[i]] as [string, never]);
  };
  const [ajustes, regras, lancamentos, categorias, fixos, metas, faturas] = await Promise.all([
    chaveValor('ajustes'), chaveValor('regras'),
    tx.objectStore('lancamentos').getAll(), tx.objectStore('categorias').getAll(), tx.objectStore('fixos').getAll(),
    tx.objectStore('metas').getAll(), tx.objectStore('faturas').getAll(),
  ]);
  return { ajustes, regras: regras as [string, string][], lancamentos, categorias, fixos, metas, faturas };
}

/** O arquivo de backup com todos os dados; com senha, o conteúdo sai criptografado (AES-GCM). */
export async function gerarArquivoDeBackup(senha?: string): Promise<string> {
  const conteudo = await lerConteudo();
  const criadoEm = new Date().toISOString();
  if (senha) {
    const arquivo: ArquivoCifrado = { formato: FORMATO, versao: VERSAO, cifrado: true, criadoEm, ...(await cifrar(JSON.stringify(conteudo), senha)) };
    return JSON.stringify(arquivo);
  }
  const arquivo: ArquivoAberto = { formato: FORMATO, versao: VERSAO, cifrado: false, criadoEm, conteudo };
  return JSON.stringify(arquivo);
}

function lerArquivo(texto: string): ArquivoAberto | ArquivoCifrado {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new ErroDeBackup('Esse arquivo não é um backup do Capi.');
  }
  const a = bruto as { formato?: unknown; versao?: unknown } | null;
  if (!a || a.formato !== FORMATO || typeof a.versao !== 'number') throw new ErroDeBackup('Esse arquivo não é um backup do Capi.');
  if ((a.versao as number) > VERSAO) throw new ErroDeBackup('Esse backup é de uma versão mais nova do Capi. Atualize o app e tente de novo.');
  return a as ArquivoAberto | ArquivoCifrado;
}

/** O arquivo escolhido exige senha? Lança ErroDeBackup se não for um backup do Capi. */
export function arquivoTemSenha(texto: string): boolean {
  return lerArquivo(texto).cifrado;
}

/** Substitui todos os dados pelos do arquivo. Só mexe nos dados depois de abrir e validar o arquivo inteiro. */
export async function restaurarArquivoDeBackup(texto: string, senha?: string): Promise<void> {
  const arquivo = lerArquivo(texto);
  let conteudo: Conteudo;
  if (arquivo.cifrado) {
    if (!senha) throw new ErroDeBackup('Esse backup tem senha. Digite a senha para restaurar.');
    conteudo = JSON.parse(await decifrar(arquivo, senha)) as Conteudo;
  } else {
    conteudo = arquivo.conteudo;
  }
  if (!conteudo || !Array.isArray(conteudo.ajustes) || !Array.isArray(conteudo.lancamentos)) {
    throw new ErroDeBackup('Esse arquivo não é um backup do Capi.');
  }

  const db = await abrirBanco();
  const tx = db.transaction([...STORES_CHAVE_VALOR, ...STORES_COM_ID], 'readwrite');
  await Promise.all([...STORES_CHAVE_VALOR, ...STORES_COM_ID].map((nome) => tx.objectStore(nome).clear()));
  for (const [chave, valor] of conteudo.ajustes) await tx.objectStore('ajustes').put(valor, chave);
  for (const [chave, valor] of conteudo.regras ?? []) await tx.objectStore('regras').put(valor, chave);
  for (const nome of STORES_COM_ID) {
    for (const item of (conteudo[nome] ?? []) as never[]) await tx.objectStore(nome).put(item);
  }
  await tx.done;
}

/** Guarda a data do último backup exportado (AAAA-MM-DD), para o lembrete do Fechamento. */
export function registrarBackupFeito(hoje: string): Promise<void> {
  return gravarAjuste('ultimo-backup', hoje);
}
