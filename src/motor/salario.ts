import { dataNoMes, diferencaEmDias, mesDaData, somarMeses } from './datas';

export interface DataDoSalario {
  /** Próxima vez que o salário cai (hoje, se for o dia), AAAA-MM-DD. */
  proximo: string;
  /** Última vez que caiu (hoje, se for o dia), AAAA-MM-DD. */
  ultimo: string;
  diasAteOProximo: number;
  ehHoje: boolean;
}

/** Quando o salário cai: dia 31 vira o último dia dos meses mais curtos. */
export function dataDoSalario(hoje: string, dia: number): DataDoSalario {
  const mes = mesDaData(hoje);
  const neste = dataNoMes(mes, dia);
  const jaCaiu = neste <= hoje;
  const proximo = neste >= hoje ? neste : dataNoMes(somarMeses(mes, 1), dia);
  const ultimo = jaCaiu ? neste : dataNoMes(somarMeses(mes, -1), dia);
  return { proximo, ultimo, diasAteOProximo: diferencaEmDias(hoje, proximo), ehHoje: neste === hoje };
}
