import type { Centavos } from '../motor/dinheiro';
import type { Categoria } from '../dominio/categorias';
import { normalizar } from './normalizar';

export interface LeituraDeLancamento {
  /** Valor total da compra. */
  valor: Centavos | null;
  loja: string;
  categoriaId: string | null;
  /** Só quando a compra é parcelada (2 a 48 vezes): em quantas Parcelas. */
  parcelas?: number;
}

/** Regras de estabelecimento: Loja normalizada → id da Categoria. */
export type RegrasDeEstabelecimento = Record<string, string>;

const NUMERO = /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?=\s|$)/i;

function paraCentavos(bruto: string): Centavos {
  let texto = bruto;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(texto)) texto = texto.replace(/\./g, '');
  const [inteiro = '0', fracao = ''] = texto.replace(',', '.').split('.');
  return Number(inteiro) * 100 + Number(fracao.padEnd(2, '0'));
}

function capitalizar(texto: string): string {
  return texto.replace(/(^|\s)(\p{L})/gu, (_, espaco: string, letra: string) => espaco + letra.toUpperCase());
}

function casaPalavra(textoNormalizado: string, palavra: string): boolean {
  const escapada = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escapada}`).test(textoNormalizado);
}

export function sugerirCategoria(loja: string, categorias: readonly Categoria[], regras: RegrasDeEstabelecimento): string | null {
  const chave = normalizar(loja);
  if (!chave) return null;
  const regra = regras[chave];
  if (regra && categorias.some((c) => c.id === regra)) return regra;
  // A palavra-chave mais longa vence ("barbearia" não é "bar").
  let melhor: { id: string; tamanho: number } | null = null;
  for (const categoria of categorias) {
    for (const palavra of categoria.palavrasChave) {
      if (casaPalavra(chave, palavra) && (!melhor || palavra.length > melhor.tamanho)) {
        melhor = { id: categoria.id, tamanho: palavra.length };
      }
    }
  }
  return melhor?.id ?? null;
}

// "10x", "em 3x", "12 x", "3 vezes"; o "de" depois ("3x de 160") diz que o valor é o de cada Parcela.
const PARCELAS = /(?:^|\s)(?:em\s+)?(\d{1,2})\s*(?:x|vezes)(?=\s|$)(\s+de(?=\s))?/i;
const MAXIMO_DE_PARCELAS = 48;

/** Transforma "ifood 42" ou "pix joão 50" em valor, Loja e Categoria sugerida. */
export function lerLancamento(texto: string, categorias: readonly Categoria[], regras: RegrasDeEstabelecimento): LeituraDeLancamento {
  const completo = texto.replace(/\s+/g, ' ').trim();
  // Primeiro tira "10x" do texto, para o número das Parcelas não ser lido como valor.
  const quando = PARCELAS.exec(completo);
  const quantidade = quando?.[1] ? Number(quando[1]) : 0;
  const limpo = quando && quantidade >= 1 && quantidade <= MAXIMO_DE_PARCELAS ? (completo.slice(0, quando.index) + ' ' + completo.slice(quando.index + quando[0].length)).replace(/\s+/g, ' ').trim() : completo;
  const parcelado = quantidade >= 2 && quantidade <= MAXIMO_DE_PARCELAS;
  const achado = NUMERO.exec(limpo);
  const bruto = achado?.[1] ? paraCentavos(achado[1]) : null;
  // "3x de 160": o número é o de cada Parcela; o valor devolvido é sempre o total.
  const valor = bruto !== null && parcelado && quando?.[2] ? bruto * quantidade : bruto;
  let resto = achado ? (limpo.slice(0, achado.index) + ' ' + limpo.slice(achado.index + achado[0].length)).replace(/\s+/g, ' ').trim() : limpo;

  const ehPix = /^pix(\s|$)/i.test(resto);
  if (ehPix) resto = resto.slice(3).trim();
  const loja = capitalizar(resto);

  if (ehPix && categorias.some((c) => c.id === 'pix-pessoas')) {
    const regra = regras[normalizar(loja)];
    return { valor, loja, categoriaId: regra ?? 'pix-pessoas', ...(parcelado ? { parcelas: quantidade } : {}) };
  }
  return { valor, loja, categoriaId: sugerirCategoria(loja, categorias, regras), ...(parcelado ? { parcelas: quantidade } : {}) };
}
