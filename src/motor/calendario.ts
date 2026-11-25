import type { AnualDeclarado } from '../dominio/onboarding';
import type { Fatura } from '../dominio/fatura';
import type { Fixo } from '../dominio/fixo';
import type { Lancamento } from '../dominio/lancamento';
import { nomesParecidos } from '../conciliacao/conciliacao';
import { dataNoMes, diferencaEmDias, diferencaEmMeses, mesDaData, mesesCompletosEntre, somarMeses } from './datas';
import type { Centavos } from './dinheiro';
import { fixosDoMes } from './fixos';
import type { Cartao } from './previsao';
import type { Recorrente } from './recorrentes';

export type TipoDeCompromisso = 'fixo' | 'parcela' | 'recorrente' | 'anual' | 'salario';

export interface Compromisso {
  /** AAAA-MM-DD */
  data: string;
  tipo: TipoDeCompromisso;
  nome: string;
  valor: Centavos;
  /** Só nos Anuais: o que a Caixinha já guardou e quanto falta. */
  caixinha?: { guardado: Centavos; falta: Centavos };
  /** Só nas Parcelas: "2/3". */
  parcela?: { atual: number; total: number };
}

export interface MesDoCalendario {
  /** AAAA-MM */
  mes: string;
  total: Centavos;
  compromissos: Compromisso[];
  /** É o mês mais pesado dos três. */
  apertado: boolean;
}

export interface Calendario {
  meses: MesDoCalendario[];
  /** AAAA-MM do mês mais apertado, ou nulo quando não há compromissos. */
  maisApertado: string | null;
}

export interface EntradaDoCalendario {
  hoje: string;
  fixos: readonly Fixo[];
  recorrentes: readonly Recorrente[];
  /** Lançamentos, para as Parcelas de compras parceladas digitadas à mão. */
  lancamentos?: readonly Lancamento[];
  faturas: readonly Fatura[];
  cartao?: Cartao;
  anuais: readonly AnualDeclarado[];
  /** Dia em que a renda cai e quanto cai; aparece como entrada, sem entrar nos totais. */
  salario?: { dia: number; valor: Centavos };
  /** Quando o Onboarding foi respondido: a Caixinha conta 1/12 do Anual por mês desde então. */
  respondidoEm: string;
}

const MESES_NA_LINHA_DO_TEMPO = 3;
const TOLERANCIA_DE_VALOR = 0.1;
const TOLERANCIA_DE_DIAS = 3;

/** A linha do tempo dos próximos 3 meses: Fixos, Parcelas, Recorrentes e Anuais com a Caixinha. */
export function montarCalendario(e: EntradaDoCalendario): Calendario {
  const mesAtual = mesDaData(e.hoje);
  const ultimaFatura = [...e.faturas].sort((a, b) => b.fechamento.localeCompare(a.fechamento))[0];
  const meses: MesDoCalendario[] = [];

  for (let i = 0; i < MESES_NA_LINHA_DO_TEMPO; i++) {
    const mes = somarMeses(mesAtual, i);
    const compromissos: Compromisso[] = [];

    const fixos = fixosDoMes(e.fixos, mes);
    for (const f of fixos) compromissos.push({ data: f.data, tipo: 'fixo', nome: f.nome, valor: f.valor });

    // Parcelas lançadas à mão (as da Importação já vêm pela última Fatura, logo abaixo).
    const manuais = (e.lancamentos ?? []).filter((l) => l.parcela && l.origem !== 'importacao' && mesDaData(l.data) === mes);
    for (const l of manuais) compromissos.push({ data: l.data, tipo: 'parcela', nome: l.loja, valor: l.valor, parcela: l.parcela });

    if (ultimaFatura) {
      const passos = diferencaEmMeses(mesDaData(ultimaFatura.fechamento), mes);
      const diaDoVencimento = e.cartao?.diaDeVencimento ?? Number(ultimaFatura.vencimento.slice(8, 10));
      for (const linha of ultimaFatura.linhas) {
        if (linha.tipo !== 'compra' || !linha.parcela) continue;
        const atual = linha.parcela.atual + passos;
        if (passos < 1 || atual > linha.parcela.total) continue;
        const total = linha.parcela.total;
        if (manuais.some((l) => l.parcela?.atual === atual && l.parcela.total === total && nomesParecidos(l.loja, linha.loja))) continue;
        compromissos.push({ data: dataNoMes(mes, diaDoVencimento), tipo: 'parcela', nome: linha.loja, valor: linha.valor, parcela: { atual, total: linha.parcela.total } });
      }
    }

    for (const r of e.recorrentes) {
      const data = dataNoMes(mes, r.dia);
      const ehFixo = fixos.some((f) => Math.abs(f.valor - r.valor) <= r.valor * TOLERANCIA_DE_VALOR && Math.abs(diferencaEmDias(f.data, data)) <= TOLERANCIA_DE_DIAS);
      if (ehFixo) continue;
      compromissos.push({ data, tipo: 'recorrente', nome: r.loja, valor: r.valor });
    }

    for (const a of e.anuais) {
      if (a.mes !== Number(mes.slice(5, 7))) continue;
      const guardado = Math.min(a.valor, Math.round((a.valor / 12) * mesesCompletosEntre(e.respondidoEm, e.hoje)));
      compromissos.push({ data: dataNoMes(mes, 1), tipo: 'anual', nome: a.nome, valor: a.valor, caixinha: { guardado, falta: a.valor - guardado } });
    }

    if (e.salario) compromissos.push({ data: dataNoMes(mes, e.salario.dia), tipo: 'salario', nome: 'Salário', valor: e.salario.valor });

    const visiveis = compromissos.filter((c) => c.data >= e.hoje).sort((a, b) => a.data.localeCompare(b.data) || a.nome.localeCompare(b.nome));
    meses.push({ mes, total: visiveis.filter((c) => c.tipo !== 'salario').reduce((s, c) => s + c.valor, 0), compromissos: visiveis, apertado: false });
  }

  const maior = Math.max(...meses.map((m) => m.total));
  const apertado = maior > 0 ? meses.find((m) => m.total === maior) : undefined;
  if (apertado) apertado.apertado = true;
  return { meses, maisApertado: apertado?.mes ?? null };
}
