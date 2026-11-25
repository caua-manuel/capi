import type { Fatura, LinhaDeFatura } from '../dominio/fatura';
import { normalizar } from '../leitor/normalizar';
import type { Centavos } from './dinheiro';

export interface Recorrente {
  /** Nome como apareceu na Fatura mais recente. */
  loja: string;
  /** Nome normalizado, usado para comparar. */
  chave: string;
  valor: Centavos;
  valorAnterior: Centavos;
  /** Dia do mês da última cobrança. */
  dia: number;
  /** Em quantas Faturas apareceu. */
  faturas: number;
  /** Valor × 12, com IOF quando é em dólar. */
  custoAnual: Centavos;
  emDolar: boolean;
  aumento: boolean;
  duplicada: boolean;
  nomeGenerico: boolean;
  categoriaId?: string;
}

// Regras do motor-financeiro.md, "Detecção de recorrentes".
const TOLERANCIA_DE_VALOR = 0.1;
const TOLERANCIA_DE_DIAS = 3;
const NOMES_GENERICOS = new Set(['assinatura', 'assinaturas', 'google', 'apple', 'pagamento', 'pagamentos', 'servico', 'servicos', 'paypal', 'mp', 'pag', 'pix']);

/** "NETFLIX.COM*1234" e "Netflix.com" viram "netflix". */
export function chaveDaLoja(loja: string): string {
  return normalizar(loja)
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\b(com|br|www|ltda|sa)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const dia = (data: string) => Number(data.slice(8, 10));
const valoresParecidos = (a: Centavos, b: Centavos) => Math.abs(a - b) <= TOLERANCIA_DE_VALOR * Math.max(a, b);
function diasParecidos(a: number, b: number): boolean {
  const diferenca = Math.abs(a - b);
  return Math.min(diferenca, 31 - diferenca) <= TOLERANCIA_DE_DIAS;
}

const ehCompraAvulsa = (l: LinhaDeFatura) => l.tipo === 'compra' && !l.parcela;

/** Estabelecimentos que reaparecem em 2+ Faturas com valor (±10%) e dia (±3) parecidos. */
export function detectarRecorrentes(faturas: readonly Fatura[], iofInternacional: number): Recorrente[] {
  const ordenadas = [...faturas].sort((a, b) => a.fechamento.localeCompare(b.fechamento));
  const porChave = new Map<string, LinhaDeFatura[][]>();
  ordenadas.forEach((f, i) => {
    for (const l of f.linhas.filter(ehCompraAvulsa)) {
      const chave = chaveDaLoja(l.loja);
      if (!chave) continue;
      const lista = porChave.get(chave) ?? ordenadas.map(() => []);
      lista[i]!.push(l);
      porChave.set(chave, lista);
    }
  });

  const recorrentes: Recorrente[] = [];
  for (const [chave, porFatura] of porChave) {
    const presentes = porFatura.filter((ls) => ls.length > 0);
    if (presentes.length < 2) continue;
    let combina = false;
    for (let i = 1; i < presentes.length; i++) {
      const a = presentes[i - 1]![0]!;
      const b = presentes[i]![0]!;
      if (valoresParecidos(a.valor, b.valor) && diasParecidos(dia(a.data), dia(b.data))) combina = true;
    }
    if (!combina) continue;
    const ultimas = presentes[presentes.length - 1]!;
    const ultima = ultimas[0]!;
    const anterior = presentes[presentes.length - 2]![0]!;
    const emDolar = presentes.some((ls) => ls.some((l) => l.emDolar));
    recorrentes.push({
      loja: ultima.loja,
      chave,
      valor: ultima.valor,
      valorAnterior: anterior.valor,
      dia: dia(ultima.data),
      faturas: presentes.length,
      custoAnual: Math.round(ultima.valor * (emDolar ? 1 + iofInternacional : 1) * 12),
      emDolar,
      aumento: ultima.valor > anterior.valor,
      duplicada: ultimas.length >= 2 && valoresParecidos(ultimas[0]!.valor, ultimas[1]!.valor),
      nomeGenerico: chave.split(' ').every((p) => NOMES_GENERICOS.has(p)),
      categoriaId: ultima.categoriaId,
    });
  }
  return recorrentes.sort((a, b) => b.custoAnual - a.custoAnual);
}
