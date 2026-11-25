import type { Centavos } from '../motor/dinheiro';

const reais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como R$. Só as Telas formatam dinheiro. */
export function formatarReais(valor: Centavos): string {
  return reais.format(valor / 100).replace(/ /g, ' ');
}

/** Centavos no formato que a pessoa digita: 4290 → "42,90". */
export function centavosParaTexto(valor: Centavos): string {
  return (valor / 100).toFixed(2).replace('.', ',');
}

function paraData(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function hoje(): string {
  return paraData(new Date());
}

export function mesDe(data: string): string {
  return data.slice(0, 7);
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function nomeDoMes(mes: string): string {
  return MESES[Number(mes.slice(5, 7)) - 1] ?? '';
}

/** "hoje", "ontem" ou "12/11". */
export function rotuloDaData(data: string): string {
  if (data === hoje()) return 'hoje';
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  if (data === paraData(ontem)) return 'ontem';
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

export function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

const reaisInteiros = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/** R$ sem centavos, para resumos: 238000 → "R$ 2.380". */
export function formatarReaisInteiros(valor: Centavos): string {
  return reaisInteiros.format(Math.round(valor / 100)).replace(/ /g, ' ');
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2027-10" → "out/2027". */
export function mesCurto(mes: string): string {
  return `${MESES_CURTOS[Number(mes.slice(5, 7)) - 1] ?? ''}/${mes.slice(0, 4)}`;
}
