import type { Fixo, FormaDePagamento, VersaoDoFixo } from '../dominio/fixo';
import type { RespostasDoOnboarding } from '../dominio/onboarding';
import { dataNoMes } from './datas';
import type { Centavos } from './dinheiro';

/** Um Fixo caindo num Mês do plano. */
export interface OcorrenciaDeFixo {
  fixoId: string;
  nome: string;
  valor: Centavos;
  /** AAAA-MM-DD */
  data: string;
  categoriaId: string;
  forma: FormaDePagamento;
}

/** A versão do Fixo que vale num mês, ou nada se ele ainda não existia ou já foi encerrado. */
export function versaoNoMes(fixo: Fixo, mes: string): VersaoDoFixo | undefined {
  if (fixo.encerradoEm && mes > fixo.encerradoEm) return undefined;
  let vigente: VersaoDoFixo | undefined;
  for (const v of fixo.versoes) {
    if (v.aPartirDe <= mes && (!vigente || v.aPartirDe >= vigente.aPartirDe)) vigente = v;
  }
  return vigente;
}

/** Os Fixos que entram sozinhos num Mês do plano, cada um no seu dia. */
export function fixosDoMes(fixos: readonly Fixo[], mes: string): OcorrenciaDeFixo[] {
  const ocorrencias: OcorrenciaDeFixo[] = [];
  for (const fixo of fixos) {
    const v = versaoNoMes(fixo, mes);
    if (!v) continue;
    ocorrencias.push({ fixoId: fixo.id, nome: v.nome, valor: v.valor, data: dataNoMes(mes, v.dia), categoriaId: v.categoriaId, forma: v.forma });
  }
  return ocorrencias.sort((a, b) => a.data.localeCompare(b.data));
}

export const ID_FIXO_MORADIA = 'onboarding-moradia';

/** Os Fixos declarados no Onboarding (moradia e pergunta 6), todos fora do cartão. */
export function fixosDoOnboarding(respostas: RespostasDoOnboarding, aPartirDe: string): Fixo[] {
  const fixos: Fixo[] = [];
  if (respostas.moradia.valor > 0) {
    fixos.push({
      id: ID_FIXO_MORADIA,
      versoes: [{ aPartirDe, nome: 'Moradia', valor: respostas.moradia.valor, dia: 10, categoriaId: 'casa-contas', forma: 'fora' }],
    });
  }
  for (const f of respostas.fixos) {
    fixos.push({
      id: `onboarding-${f.id}`,
      versoes: [{ aPartirDe, nome: f.nome, valor: f.valor, dia: f.dia, categoriaId: f.categoriaId, forma: 'fora' }],
    });
  }
  return fixos;
}
