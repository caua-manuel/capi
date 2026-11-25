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
  const metas = planejarMetas({
    hoje: e.hoje, metas: e.metas ?? [], dividas: e.onboarding.dividas, diagnostico, plano, categorias: e.categorias,
    rendimentoMensal: e.parametros.rendimentoMensalConservador,
  });
  const dividas = analisarDividas(e.onboarding.dividas, diagnostico.sobra, diagnostico.renda);
  return { diagnostico, mesDoPlano, plano, metas, dividas };
}
