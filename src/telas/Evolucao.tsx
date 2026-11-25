import { NOMES_DOS_GRUPOS, type Grupo } from '../dominio/categorias';
import { Icone } from '../componentes/Icone';
import type { EvolucaoDaFatura } from '../motor/evolucao';
import { Valor } from './discreto';
import { mesCurto, nomeDoMes } from './formato';

const GRUPOS: { grupo: Grupo; cor: string }[] = [
  { grupo: 'essencial', cor: 'var(--s1)' },
  { grupo: 'estilo-de-vida', cor: 'var(--s2)' },
  { grupo: 'guardar-quitar', cor: 'var(--s3)' },
];

const abreviado = (mes: string) => nomeDoMes(mes).slice(0, 3);

/** Barras empilhadas dos últimos 6 meses do cartão, por Grupo. Tela de número: sem Capi. */
export function Evolucao({ evolucao }: { evolucao: EvolucaoDaFatura }) {
  const maior = Math.max(1, ...evolucao.meses.map((m) => m.total));
  const alta = evolucao.altaSeguida;
  const temAlgo = evolucao.meses.some((m) => m.total > 0);

  return (
    <section className="cartao" style={{ margin: '12px 0 0' }} aria-label="Mês a mês">
      <h2 className="titulo">Mês a mês</h2>
      <p className="rotulo" style={{ margin: '2px 0 0' }}>O que foi pago no cartão nos últimos 6 meses, por Grupo.</p>

      {alta && (
        <div className="cartao-gelo" style={{ margin: '12px 0 0', padding: '12px 14px', gap: 10, alignItems: 'flex-start' }} role="note">
          <span className="icone-redondo" style={{ background: 'rgba(255,255,255,.7)' }}><Icone nome="grafico" tamanho={20} /></span>
          <p style={{ margin: 0, fontWeight: 500 }}>
            Sua fatura cresceu {alta.meses} meses seguidos, de {nomeDoMes(alta.de)} a {nomeDoMes(alta.ate)}: <b className="num">+<Valor centavos={alta.aumento} semCentavos /></b> em relação a {nomeDoMes(alta.de)}.
          </p>
        </div>
      )}

      {temAlgo ? (
        <>
          <ol className="evolucao-barras" aria-hidden="true">
            {evolucao.meses.map((m) => (
              <li key={m.mes}>
                <span className="evolucao-total num"><Valor centavos={m.total} semCentavos /></span>
                <span className={m.emAndamento ? 'evolucao-coluna em-andamento' : 'evolucao-coluna'}>
                  {GRUPOS.map(({ grupo, cor }) => (
                    <span key={grupo} style={{ height: `${(m.porGrupo[grupo] / maior) * 120}px`, background: cor }} />
                  ))}
                </span>
                <span className="evolucao-mes">{abreviado(m.mes)}</span>
              </li>
            ))}
          </ol>
          <ul className="evolucao-legenda" aria-hidden="true">
            {GRUPOS.map(({ grupo, cor }) => <li key={grupo}><i style={{ background: cor }} />{NOMES_DOS_GRUPOS[grupo]}</li>)}
            <li>O mês de hoje, mais claro, ainda está em andamento.</li>
          </ul>
          <table className="so-leitor">
            <caption>Gastos no cartão por mês e por Grupo</caption>
            <thead><tr><th>Mês</th>{GRUPOS.map(({ grupo }) => <th key={grupo}>{NOMES_DOS_GRUPOS[grupo]}</th>)}<th>Total</th></tr></thead>
            <tbody>
              {evolucao.meses.map((m) => (
                <tr key={m.mes}>
                  <th>{mesCurto(m.mes)}{m.emAndamento ? ' (em andamento)' : ''}</th>
                  {GRUPOS.map(({ grupo }) => <td key={grupo}><Valor centavos={m.porGrupo[grupo]} /></td>)}
                  <td><Valor centavos={m.total} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="texto-2" style={{ margin: '12px 0 0' }}>Quando houver gastos no cartão, o gráfico aparece aqui.</p>
      )}
    </section>
  );
}
