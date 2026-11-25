import type { LinhaDeFatura } from '../dominio/fatura';
import type { Lancamento } from '../dominio/lancamento';
import { diferencaEmDias } from '../motor/datas';
import type { OcorrenciaDeFixo } from '../motor/fixos';
import { chaveDaLoja } from '../motor/recorrentes';

// Regras da Conciliação (GLOSSARY.md e spec): mesmo valor, até 3 dias, nome parecido.
const TOLERANCIA_DE_DIAS = 3;
const ID_OUTROS = 'outros';

export interface EntradaDaConciliacao {
  linhas: readonly LinhaDeFatura[];
  lancamentos: readonly Lancamento[];
  fixosNoCartao: readonly OcorrenciaDeFixo[];
  /** Ciclo da Fatura (datas de compra), para achar Lançamentos que deveriam estar nela. */
  periodo: { de: string; ate: string };
  /** Categoria pela Loja (Regras de estabelecimento e palavras-chave), ou nulo. */
  sugerirCategoria: (loja: string) => string | null;
  /** Momento da Importação, ISO: vira o `criadoEm` dos Lançamentos novos. */
  agora: string;
}

export type Par = { linhaId: string; lancamentoId: string } | { linhaId: string; fixoId: string };

export type ItemParaRevisar =
  | { motivo: 'lancamento-sem-par'; lancamentoId: string }
  | { motivo: 'linha-duvidosa'; linhaId: string; lancamentoId: string }
  | { motivo: 'sem-categoria'; linhaId: string };

export interface ResultadoDaConciliacao {
  pares: Par[];
  /** Lançamentos que já existiam e foram juntados: a Fatura prevalece na data e no valor. */
  atualizados: Lancamento[];
  /** Linhas sem par que viram Lançamentos. */
  novos: Lancamento[];
  revisar: ItemParaRevisar[];
  /** Pagamento da fatura e estornos. */
  ignoradas: string[];
  /** Linhas que já tinham virado Lançamento numa Importação anterior. */
  jaImportadas: string[];
}

/** Nomes parecidos: um contém o outro, ou dividem uma palavra de 3+ letras. */
export function nomesParecidos(a: string, b: string): boolean {
  const x = chaveDaLoja(a);
  const y = chaveDaLoja(b);
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const palavras = new Set(x.split(' ').filter((p) => p.length >= 3));
  return y.split(' ').some((p) => p.length >= 3 && palavras.has(p));
}

const ehPix = (l: Lancamento) => l.categoriaId === 'pix-pessoas' || /^pix\b/i.test(l.loja.trim());
const perto = (a: string, b: string) => Math.abs(diferencaEmDias(a, b)) <= TOLERANCIA_DE_DIAS;

export function conciliar(e: EntradaDaConciliacao): ResultadoDaConciliacao {
  const r: ResultadoDaConciliacao = { pares: [], atualizados: [], novos: [], revisar: [], ignoradas: [], jaImportadas: [] };
  const jaUsadas = new Set(e.lancamentos.map((l) => l.idDaLinha).filter((id): id is string => !!id));
  const livres = e.lancamentos.filter((l) => !l.idDaLinha);
  const lancamentosUsados = new Set<string>();
  const fixosUsados = new Set<string>();

  for (const linha of e.linhas) {
    if (jaUsadas.has(linha.id)) { r.jaImportadas.push(linha.id); continue; }
    if (linha.tipo === 'pagamento' || linha.tipo === 'estorno') { r.ignoradas.push(linha.id); continue; }

    if (linha.tipo === 'compra') {
      // Fixo no cartão: o valor e o dia bastam, porque o nome na Fatura raramente é o nome que o Usuário deu.
      const fixo = e.fixosNoCartao.find((f) => !fixosUsados.has(f.fixoId) && f.valor === linha.valor && perto(f.data, linha.data));
      if (fixo) {
        fixosUsados.add(fixo.fixoId);
        r.pares.push({ linhaId: linha.id, fixoId: fixo.fixoId });
        continue;
      }
      const candidatos = livres
        .filter((l) => !lancamentosUsados.has(l.id) && l.valor === linha.valor && perto(l.data, linha.data))
        .sort((a, b) => Math.abs(diferencaEmDias(a.data, linha.data)) - Math.abs(diferencaEmDias(b.data, linha.data)));
      const par = candidatos.find((l) => nomesParecidos(l.loja, linha.loja));
      if (par) {
        lancamentosUsados.add(par.id);
        r.pares.push({ linhaId: linha.id, lancamentoId: par.id });
        r.atualizados.push({ ...par, data: linha.data, valor: linha.valor, idDaLinha: linha.id, ...(linha.parcela ? { parcela: linha.parcela } : {}) });
        continue;
      }
      const duvida = candidatos[0];
      if (duvida) {
        // Mesmo valor e data, nome diferente: o Usuário decide em Revisar, sem contar duas vezes.
        lancamentosUsados.add(duvida.id);
        r.revisar.push({ motivo: 'linha-duvidosa', linhaId: linha.id, lancamentoId: duvida.id });
        continue;
      }
    }

    const iof = linha.tipo === 'iof';
    const sugerida = iof ? ID_OUTROS : (linha.categoriaId ?? e.sugerirCategoria(linha.loja));
    if (!sugerida) r.revisar.push({ motivo: 'sem-categoria', linhaId: linha.id });
    r.novos.push({
      id: `imp-${linha.id}`,
      valor: linha.valor,
      loja: iof ? 'IOF' : linha.loja,
      categoriaId: sugerida ?? ID_OUTROS,
      data: linha.data,
      origem: 'importacao',
      criadoEm: e.agora,
      idDaLinha: linha.id,
      ...(linha.parcela ? { parcela: linha.parcela } : {}),
    });
  }

  for (const l of livres) {
    if (lancamentosUsados.has(l.id) || l.origem === 'importacao' || ehPix(l)) continue;
    if (l.data >= e.periodo.de && l.data <= e.periodo.ate) r.revisar.push({ motivo: 'lancamento-sem-par', lancamentoId: l.id });
  }
  return r;
}
