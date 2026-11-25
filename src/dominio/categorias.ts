export type Grupo = 'essencial' | 'estilo-de-vida' | 'guardar-quitar';

export const NOMES_DOS_GRUPOS: Record<Grupo, string> = {
  essencial: 'Essencial',
  'estilo-de-vida': 'Estilo de vida',
  'guardar-quitar': 'Guardar/quitar',
};

export interface Categoria {
  id: string;
  nome: string;
  grupo: Grupo;
  palavrasChave: string[];
  /** As 17 padrão só podem ser escondidas, nunca apagadas. */
  padrao: boolean;
}

const c = (id: string, nome: string, grupo: Grupo, palavrasChave: string[]): Categoria => ({ id, nome, grupo, palavrasChave, padrao: true });

export const CATEGORIAS_PADRAO: readonly Categoria[] = [
  c('mercado', 'Mercado', 'essencial', ['mercado', 'supermercado', 'atacad', 'hortifruti', 'pao de acucar', 'guanabara', 'assai', 'carrefour', 'sacolao', 'feira']),
  c('delivery', 'Delivery', 'estilo-de-vida', ['ifood', '99food', 'rappi', 'ze delivery', 'delivery']),
  c('comida-fora', 'Comida fora', 'estilo-de-vida', ['restaurante', 'lanchonete', 'burger', 'mc donalds', 'mcdonalds', 'pizza', 'bar', 'acai', 'sorvete', 'padaria', 'cafe', 'almoco', 'jantar', 'lanche']),
  c('transporte-app', 'Transporte por app', 'essencial', ['uber', '99', '99app', '99 ride', 'cabify', 'indrive']),
  c('combustivel', 'Combustível', 'essencial', ['posto', 'auto posto', 'shell', 'ipiranga', 'br mania', 'gasolina', 'combustivel', 'etanol']),
  c('transporte', 'Transporte', 'essencial', ['metro', 'onibus', 'bilhete', 'trem', 'estacionamento', 'park', 'sem parar', 'conectcar', 'pedagio']),
  c('compras-online', 'Compras online', 'estilo-de-vida', ['amazon', 'shopee', 'mercado livre', 'shein', 'magalu', 'aliexpress', 'temu']),
  c('compras', 'Compras', 'estilo-de-vida', ['americanas', 'shopping', 'loja', 'roupa', 'renner', 'riachuelo', 'c&a', 'zara']),
  c('lazer', 'Lazer', 'estilo-de-vida', ['cinema', 'show', 'ingresso', 'teatro', 'parque', 'viagem', 'hotel', 'airbnb']),
  c('assinaturas', 'Assinaturas', 'estilo-de-vida', ['netflix', 'spotify', 'prime', 'apple.com', 'icloud', 'google', 'chatgpt', 'openai', 'claude', 'disney', 'max', 'youtube', 'globoplay']),
  c('saude', 'Saúde', 'essencial', ['drogaria', 'farma', 'farmacia', 'clinica', 'laboratorio', 'hospital', 'medico', 'dentista', 'remedio', 'raia', 'drogasil', 'pacheco']),
  c('treino', 'Treino', 'estilo-de-vida', ['academia', 'smartfit', 'smart fit', 'crossfit', 'gympass', 'wellhub', 'pilates', 'treino']),
  c('educacao', 'Educação', 'essencial', ['faculdade', 'curso', 'udemy', 'alura', 'livraria', 'livro', 'escola', 'material']),
  c('casa-contas', 'Casa e contas', 'essencial', ['aluguel', 'condominio', 'luz', 'energia', 'agua', 'gas', 'internet', 'claro', 'vivo', 'tim', 'enel', 'sabesp', 'iptu']),
  c('cuidados-pessoais', 'Cuidados pessoais', 'estilo-de-vida', ['barbearia', 'barbeiro', 'salao', 'estetica', 'manicure', 'cabelo', 'perfumaria', 'boticario']),
  c('pix-pessoas', 'Pix para pessoas', 'estilo-de-vida', ['pix']),
  c('outros', 'Outros', 'estilo-de-vida', []),
];

export const ID_OUTROS = 'outros';

export function criarCategoriaPropria(id: string, nome: string, grupo: Grupo): Categoria {
  return { id, nome: nome.replace(/\s+/g, ' ').trim(), grupo, palavrasChave: [], padrao: false };
}

/**
 * `todas`: padrão + próprias, para nomear qualquer Lançamento (inclusive de Categoria escondida).
 * `visiveis`: as que aparecem no lançamento. Outros nunca some.
 */
export function montarCategorias(proprias: readonly Categoria[], escondidas: readonly string[]) {
  const semOutros = CATEGORIAS_PADRAO.filter((cat) => cat.id !== ID_OUTROS);
  const outros = CATEGORIAS_PADRAO.filter((cat) => cat.id === ID_OUTROS);
  const todas: Categoria[] = [...semOutros, ...proprias, ...outros];
  const visiveis = todas.filter((cat) => cat.id === ID_OUTROS || !escondidas.includes(cat.id));
  return { todas, visiveis };
}
