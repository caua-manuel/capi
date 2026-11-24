import type { Categoria } from '../dominio/categorias';
import type { Fixo } from '../dominio/fixo';
import type { Lancamento } from '../dominio/lancamento';
import type { RespostasDoOnboarding } from '../dominio/onboarding';
import { mesDaData } from './datas';
import { diagnosticar, type Diagnostico } from './diagnostico';
import { fixosDoMes } from './fixos';
import type { Parametros } from './parametros';

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
}

export interface SaidaDoMotor {
  diagnostico: Diagnostico;
}

/** A função de entrada do Motor: puro, sem tela e sem ler nem gravar dados. */
export function calcular(e: EntradaDoMotor): SaidaDoMotor {
  const mes = mesDaData(e.hoje);
  const doMes = fixosDoMes(e.fixos, mes);
  const diagnostico = diagnosticar({
    hoje: e.hoje, onboarding: e.onboarding, fixosDoMes: doMes, categorias: e.categorias, lancamentos: e.lancamentos, parametros: e.parametros,
  });
  return { diagnostico };
}
