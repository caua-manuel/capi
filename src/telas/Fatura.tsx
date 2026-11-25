import { useState } from 'react';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import type { Categoria } from '../dominio/categorias';
import type { Cartao, PrevisaoDeFatura } from '../motor/previsao';
import { Valor } from './discreto';
import { nomeDoMes } from './formato';
import { navegar } from './rotas';
import { Evolucao } from './Evolucao';
import type { EvolucaoDaFatura } from '../motor/evolucao';

interface Props {
  previsao: PrevisaoDeFatura | null;
  /** Últimos 6 meses por Grupo; nulo antes do Onboarding. */
  evolucao?: EvolucaoDaFatura | null;
  cartao: Cartao | undefined;
  categorias: readonly Categoria[];
  onSalvarCartao: (cartao: Cartao) => void;
}

const dia = (v: string) => Math.min(31, Math.max(1, Number(v) || 1));

function FormCartao({ inicial, onSalvar }: { inicial?: Cartao; onSalvar: (c: Cartao) => void }) {
  const [fechamento, setFechamento] = useState(inicial?.diaDeFechamento ?? 5);
  const [vencimento, setVencimento] = useState(inicial?.diaDeVencimento ?? 15);
  return (
    <div className="linha-form">
      <div className="linha-dupla">
        <label className="rotulo">Fecha no dia
          <input className="seletor num" type="number" min={1} max={31} value={fechamento} onChange={(e) => setFechamento(dia(e.target.value))} />
        </label>
        <label className="rotulo">Vence no dia
          <input className="seletor num" type="number" min={1} max={31} value={vencimento} onChange={(e) => setVencimento(dia(e.target.value))} />
        </label>
      </div>
      <button type="button" className="chip" aria-pressed="true" onClick={() => onSalvar({ diaDeFechamento: fechamento, diaDeVencimento: vencimento })}>Salvar</button>
    </div>
  );
}

/** Tela de número: sem Capi (DESIGN.md). */
export function Fatura({ previsao, evolucao, cartao, categorias, onSalvarCartao }: Props) {
  const [editando, setEditando] = useState(false);
  const nome = (id: string) => categorias.find((c) => c.id === id)?.nome ?? 'Outros';
  const mes = previsao ? nomeDoMes(previsao.ciclo.vencimento.slice(0, 7)) : '';
  const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1={previsao ? `Fatura de ${mes}` : 'Fatura'} linha2="prevista" onVoltar={() => navegar('inicio')} />
      <Folha>
        {!cartao || editando ? (
          <section className="cartao" style={{ margin: 0 }}>
            <h2 className="titulo">Datas do seu cartão</h2>
            <p className="rotulo" style={{ margin: '2px 0 10px' }}>Com o dia de fechamento eu separo o que entra nesta fatura e o que fica para a próxima.</p>
            <FormCartao inicial={cartao} onSalvar={(c) => { onSalvarCartao(c); setEditando(false); }} />
          </section>
        ) : previsao && (
          <>
            <section className="cartao-destaque" style={{ margin: 0 }}>
              <div className="sub">Fecha {previsao.diasAteFechamento === 0 ? 'hoje' : previsao.diasAteFechamento === 1 ? 'amanhã' : `em ${previsao.diasAteFechamento} dias`}</div>
              <div className="num numero-grande"><Valor centavos={previsao.total} /></div>
              <div className="sub" style={{ marginTop: 2 }}>
                Compras de {ddmm(previsao.ciclo.de)} a {ddmm(previsao.ciclo.ate)} · vence {ddmm(previsao.ciclo.vencimento)}
              </div>
            </section>
            {previsao.porCategoria.length === 0 ? (
              <section className="cartao" style={{ margin: '12px 0 0' }}><p className="texto-2" style={{ margin: 0 }}>Nada no cartão neste ciclo ainda.</p></section>
            ) : (
              <section className="cartao" style={{ margin: '12px 0 0' }} aria-label="Por Categoria">
                <h2 className="titulo">Por Categoria</h2>
                <ul className="lista-divisao">
                  {previsao.porCategoria.map((c) => (
                    <li key={c.categoriaId}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{nome(c.categoriaId)}</span>
                        <span className="num" style={{ fontWeight: 600 }}><Valor centavos={c.total} /></span>
                      </div>
                      <div className="barra-progresso" aria-hidden="true"><div style={{ width: `${previsao.total > 0 ? (c.total / previsao.total) * 100 : 0}%` }} /></div>
                      <ul className="lojas-da-categoria">
                        {c.lojas.map((l) => (
                          <li key={l.loja}><span>{l.loja}</span><span className="num"><Valor centavos={l.total} /></span></li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {evolucao && <Evolucao evolucao={evolucao} />}
            <p className="rotulo" style={{ margin: '12px 8px 0' }}>
              Soma os gastos do ciclo no cartão, as próximas parcelas, as assinaturas e os Fixos no cartão que ainda vão cair. Os números valem até o último lançamento.
            </p>
            <button type="button" className="link" style={{ width: 'auto', marginLeft: 8 }} onClick={() => setEditando(true)}>Mudar as datas do cartão</button>
          </>
        )}
      </Folha>
    </main>
  );
}
