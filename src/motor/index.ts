import type { Categoria } from '../dominio/categorias';
import type { Fixo } from '../dominio/fixo';
import type { Lancamento } from '../dominio/lancamento';
import type { RespostasDoOnboarding } from '../dominio/onboarding';
import { mesDaData } from './datas';
import { diagnosticar, type Diagnostico } from './diagnostico';
import type { Centavos } from './dinheiro';
import { fixosDoMes, type OcorrenciaDeFixo } from './fixos';
import type { Parametros } from './parametros';
import { planejar, type Plano } from './plano';
import { planejarMetas, type PlanoDasMetas } from './metas';
import type { Meta } from '../dominio/meta';
import { analisarDividas, type AnaliseDasDividas } from './dividas';
import { detectarRecorrentes, type Recorrente } from './recorrentes';
import type { Fatura } from '../dominio/fatura';
import { preverFatura, type Cartao, type PrevisaoDeFatura } from './previsao';
import { escolherAvisos, type Aviso, type AvisoMostrado } from './avisos';
import { gerarDicas, type Dica } from './dicas';

import { sugerirInvestimento, type SugestaoDeInvestimento } from './investir';

/** Tudo o que o Motor precisa. As Telas leem do Repositório e passam aqui. */
export interface EntradaDoMotor {
  /** Dia de hoje, AAAA-MM-DD. */
  hoje: string;
  onboarding: RespostasDoOnboarding;
  fixos: readonly Fixo[];
  /** Todas as Categorias (padrão e próprias, inclusive escondidas). */
  categorias: readonly Categoria[];
  /** Lançamentos dos últimos meses. */
  lancamentos: readonly Lancamento[];
  parametros: Parametros;
  /** Metas criadas pelo Usuário. */
  metas?: readonly Meta[];
  /** Faturas já importadas (só as linhas, nunca o texto colado). */
  faturas?: readonly Fatura[];
  /** Dia de fechamento e de vencimento do cartão; sem ele não há Previsão de fatura. */
  cartao?: Cartao;
  /** Avisos já mostrados, para o limite de 3 por semana. */
  avisosMostrados?: readonly AvisoMostrado[];
  /** Dia em que o app foi aberto pela última vez antes de hoje, AAAA-MM-DD. */
  ultimaAbertura?: string;
  /** Compra simulada pelo "Posso comprar?". */
  compra?: { valor: Centavos; parcelas: number };
}

export interface MesDoPlano {
  /** AAAA-MM */
  mes: string;
  /** Fixos que entram sozinhos neste mês, no dia de cada um. */
  fixos: OcorrenciaDeFixo[];
  /** Só os Fixos pagos no cartão: os que vão aparecer na Fatura. */
  fixosNoCartao: OcorrenciaDeFixo[];
  totalDosFixos: Centavos;
}

export interface SaidaDoMotor {
  diagnostico: Diagnostico;
  mesDoPlano: MesDoPlano;
  plano: Plano;
  metas: PlanoDasMetas;
  /** Nulo quando não há Dívidas. */
  dividas: AnaliseDasDividas | null;
  recorrentes: Recorrente[];
  previsao: PrevisaoDeFatura | null;
  avisos: Aviso[];
  dicas: Dica[];
  /** Só quando o objetivo inclui investir e o perfil foi respondido. */
  investimento: SugestaoDeInvestimento | null;
}

/** A função de entrada do Motor: puro, sem tela e sem ler nem gravar dados. */
export function calcular(e: EntradaDoMotor): SaidaDoMotor {
  const mes = mesDaData(e.hoje);
  const doMes = fixosDoMes(e.fixos, mes);
  const diagnostico = diagnosticar({
    hoje: e.hoje, onboarding: e.onboarding, fixosDoMes: doMes, categorias: e.categorias, lancamentos: e.lancamentos, parametros: e.parametros,
  });
  const mesDoPlano: MesDoPlano = {
    mes, fixos: doMes, fixosNoCartao: doMes.filter((f) => f.forma === 'cartao'), totalDosFixos: doMes.reduce((s, f) => s + f.valor, 0),
  };
  const plano = planejar({ hoje: e.hoje, diagnostico, fixosDoMes: doMes, categorias: e.categorias, lancamentos: e.lancamentos });
  const metasCom = (extra: Centavos) => planejarMetas({
    hoje: e.hoje, metas: e.metas ?? [], dividas: e.onboarding.dividas, diagnostico: { ...diagnostico, sobra: diagnostico.sobra + extra },
    plano, categorias: e.categorias, rendimentoMensal: e.parametros.rendimentoMensalConservador, compra: e.compra,
    guardaPorMes: e.onboarding.guardaPorMes,
  });
  const metas = metasCom(0);
  const dividas = analisarDividas(e.onboarding.dividas, diagnostico.sobra, diagnostico.renda, e.onboarding.pagaAlemDasParcelas);
  const recorrentes = detectarRecorrentes(e.faturas ?? [], e.parametros.iofInternacional);
  const previsao = e.cartao ? preverFatura({
    hoje: e.hoje, cartao: e.cartao, lancamentos: e.lancamentos, faturas: e.faturas ?? [], fixos: e.fixos, recorrentes,
    iofInternacional: e.parametros.iofInternacional,
  }) : null;
  const avisos = escolherAvisos({
    hoje: e.hoje, onboarding: e.onboarding, plano, metas, recorrentes, avisosMostrados: e.avisosMostrados ?? [], ultimaAbertura: e.ultimaAbertura,
  });
  const dicas = gerarDicas({
    hoje: e.hoje, onboarding: e.onboarding, diagnostico, plano, metas, recorrentes, lancamentos: e.lancamentos, faturas: e.faturas ?? [],
    parametros: e.parametros, metasComExtra: metasCom,
  });
  const reservaCompleta = metas.escada.find((m) => m.id === 'reserva')?.feita ?? false;
  const investimento = e.onboarding.objetivos.includes('investir') && e.onboarding.perfilDeInvestidor
    ? sugerirInvestimento(e.onboarding.perfilDeInvestidor, reservaCompleta)
    : null;
  return { diagnostico, mesDoPlano, plano, metas, dividas, recorrentes, previsao, avisos, dicas, investimento };
}
