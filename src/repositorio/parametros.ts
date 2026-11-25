import { PARAMETROS_PADRAO, type Parametros } from '../motor/parametros';
import { gravarAjuste, lerAjuste } from './ajustes';

const CHAVE = 'parametros';

/** A tabela editada pelo Usuário e a data da última atualização de cada Parâmetro (AAAA-MM-DD). */
export interface ParametrosSalvos {
  valores: Parametros;
  datas: Record<string, string>;
}

export function parametrosPadraoSalvos(): ParametrosSalvos {
  return { valores: PARAMETROS_PADRAO, datas: {} };
}

/** Sem nada salvo, vale a tabela padrão. Campos novos da tabela padrão entram sozinhos. */
export async function lerParametros(): Promise<ParametrosSalvos> {
  const salvo = await lerAjuste<ParametrosSalvos>(CHAVE);
  if (!salvo) return parametrosPadraoSalvos();
  return {
    valores: { ...PARAMETROS_PADRAO, ...salvo.valores, irRendaFixa: { ...PARAMETROS_PADRAO.irRendaFixa, ...salvo.valores.irRendaFixa } },
    datas: salvo.datas ?? {},
  };
}

export function gravarParametros(p: ParametrosSalvos): Promise<void> {
  return gravarAjuste(CHAVE, p);
}
