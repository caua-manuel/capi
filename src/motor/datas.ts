// Datas como texto: dia AAAA-MM-DD e mês AAAA-MM. Sem fuso horário.

export function mesDaData(data: string): string {
  return data.slice(0, 7);
}

export function somarMeses(mes: string, n: number): string {
  const [a, m] = mes.split('-').map(Number) as [number, number];
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export function diasNoMes(mes: string): number {
  const [a, m] = mes.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/** Dia do mês ajustado para meses mais curtos (dia 31 em fevereiro cai no último dia). */
export function dataNoMes(mes: string, dia: number): string {
  return `${mes}-${String(Math.min(Math.max(1, dia), diasNoMes(mes))).padStart(2, '0')}`;
}

/** Meses inteiros entre duas datas (completos pelo dia). */
export function mesesCompletosEntre(de: string, ate: string): number {
  const [a1, m1, d1] = de.split('-').map(Number) as [number, number, number];
  const [a2, m2, d2] = ate.split('-').map(Number) as [number, number, number];
  let meses = (a2 - a1) * 12 + (m2 - m1);
  if (d2 < d1) meses -= 1;
  return Math.max(0, meses);
}

export function diferencaEmMeses(de: string, ate: string): number {
  const [a1, m1] = de.split('-').map(Number) as [number, number];
  const [a2, m2] = ate.split('-').map(Number) as [number, number];
  return (a2 - a1) * 12 + (m2 - m1);
}

function paraUtc(data: string): number {
  const [a, m, d] = data.split('-').map(Number) as [number, number, number];
  return Date.UTC(a, m - 1, d);
}

export function diferencaEmDias(de: string, ate: string): number {
  return Math.round((paraUtc(ate) - paraUtc(de)) / 86400000);
}

export function somarDias(data: string, n: number): string {
  const d = new Date(paraUtc(data) + n * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
