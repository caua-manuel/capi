import type { Centavos } from '../motor/dinheiro';

/**
 * Contrato público da URL de entrada (ADR 0003). Os Atalhos já instalados dependem dele:
 *   <endereço do app>/lancar?valor=42,50&loja=iFood&origem=applepay
 * Não mude nem remova `valor`, `loja` e `origem` sem manter compatibilidade.
 */
export interface EntradaPelaUrl {
  valor: Centavos | null;
  loja: string;
  origem: 'applepay' | 'manual';
}

const TAMANHO_MAXIMO_DA_LOJA = 60;

/** "R$ 1.234,56", "1234.56", "42,5" ou "1.500" em centavos; nulo se não for número. */
export function valorEmCentavos(texto: string): Centavos | null {
  let limpo = texto.replace(/[^\d.,]/g, '');
  if (!limpo) return null;
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) limpo = limpo.replace(/\./g, '');
  const numero = Number(limpo);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.round(numero * 100);
}

export function lerUrlDeEntrada(busca: string): EntradaPelaUrl | null {
  const parametros = new URLSearchParams(busca);
  if (!parametros.has('valor') && !parametros.has('loja')) return null;
  const valor = valorEmCentavos(parametros.get('valor') ?? '');
  const loja = (parametros.get('loja') ?? '').replace(/\s+/g, ' ').trim().slice(0, TAMANHO_MAXIMO_DA_LOJA);
  const origem = parametros.get('origem') === 'applepay' ? 'applepay' : 'manual';
  return { valor, loja, origem };
}
