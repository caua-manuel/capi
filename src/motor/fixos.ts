import type { Fixo, FormaDePagamento, VersaoDoFixo } from '../dominio/fixo';
import type { RespostasDoOnboarding } from '../dominio/onboarding';
import { dataNoMes, somarMeses } from './datas';
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

export type MudancaNoFixo = Partial<Omit<VersaoDoFixo, 'aPartirDe'>>;

/** Edita um Fixo a partir de um mês: os meses anteriores continuam como estavam. */
export function editarFixo(fixo: Fixo, aPartirDe: string, mudanca: MudancaNoFixo): Fixo {
  const base = versaoNoMes(fixo, aPartirDe) ?? fixo.versoes[fixo.versoes.length - 1];
  if (!base) throw new Error('Fixo sem versão');
  const nova: VersaoDoFixo = { ...base, ...mudanca, aPartirDe };
  const versoes = [...fixo.versoes.filter((v) => v.aPartirDe !== aPartirDe), nova].sort((a, b) => a.aPartirDe.localeCompare(b.aPartirDe));
  // Editar antes do encerramento mantém o encerramento; editar depois dele traz o Fixo de volta.
  return fixo.encerradoEm && aPartirDe <= fixo.encerradoEm ? { id: fixo.id, versoes, encerradoEm: fixo.encerradoEm } : { id: fixo.id, versoes };
}

/** Tira o Fixo a partir de um mês, mantendo os meses anteriores. */
export function encerrarFixo(fixo: Fixo, aPartirDe: string): Fixo {
  return { ...fixo, encerradoEm: somarMeses(aPartirDe, -1) };
}

export const ID_FIXO_MORADIA = 'onboarding-moradia';

const mesmoConteudo = (a: VersaoDoFixo, b: VersaoDoFixo) =>
  a.nome === b.nome && a.valor === b.valor && a.dia === b.dia && a.categoriaId === b.categoriaId && a.forma === b.forma;

/**
 * Leva as respostas do Onboarding para os Fixos cadastrados, a partir de um mês.
 * Só mexe nos Fixos que vieram do Onboarding; os cadastrados à mão ficam como estão.
 */
export function sincronizarFixosDoOnboarding(atuais: readonly Fixo[], respostas: RespostasDoOnboarding, mes: string): Fixo[] {
  const desejados = fixosDoOnboarding(respostas, mes);
  const resultado: Fixo[] = [];
  for (const fixo of atuais) {
    if (!fixo.id.startsWith('onboarding-')) {
      resultado.push(fixo);
      continue;
    }
    const desejado = desejados.find((d) => d.id === fixo.id);
    const vigente = versaoNoMes(fixo, mes);
    if (!desejado) {
      resultado.push(vigente ? encerrarFixo(fixo, mes) : fixo);
      continue;
    }
    const nova = desejado.versoes[0]!;
    // Mantém a forma de pagamento escolhida depois na tela de Fixos.
    const comForma = vigente ? { ...nova, forma: vigente.forma } : nova;
    resultado.push(vigente && mesmoConteudo(vigente, comForma) ? fixo : editarFixo(fixo, mes, comForma));
  }
  for (const desejado of desejados) {
    if (!atuais.some((f) => f.id === desejado.id)) resultado.push(desejado);
  }
  return resultado;
}

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
