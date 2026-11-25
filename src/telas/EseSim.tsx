import { useMemo, useState } from 'react';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { Icone } from '../componentes/Icone';
import type { Categoria } from '../dominio/categorias';
import type { Meta } from '../dominio/meta';
import type { EntradaDoMotor } from '../motor';
import { simularEse, type Cenario } from '../motor/simulador';
import { Valor } from './discreto';
import { mesCurto } from './formato';
import { navegar } from './rotas';

interface Props {
  entrada: EntradaDoMotor;
  /** Metas criadas pelo Usuário. */
  metas: readonly Meta[];
  categorias: readonly Categoria[];
  onAplicar: (cenario: Cenario) => void;
}

const PASSO_DO_CORTE = 2000;
const PASSO_DO_EXTRA = 5000;
const MAXIMO_DO_EXTRA = 60000;

/** Faixa do custo da Meta: de metade a quase o dobro, com o valor de hoje sempre em cima de um passo. */
function faixaDoCusto(custo: number, atual: number) {
  const passo = Math.max(2500, Math.round(custo / 40 / 2500) * 2500);
  const abaixo = Math.max(0, Math.floor((custo - Math.max(atual, custo * 0.5)) / passo));
  const acima = Math.floor((custo * 1.8 - custo) / passo);
  return { passo, minimo: custo - abaixo * passo, maximo: custo + acima * passo };
}

function textoDaDiferenca(meses: number | null): string {
  if (meses === null) return 'sem comparação';
  if (meses === 0) return 'mesma data de hoje';
  const n = Math.abs(meses);
  return `${n} ${n === 1 ? 'mês' : 'meses'} ${meses > 0 ? 'antes' : 'depois'}`;
}

/** Tela de número: sem Capi (DESIGN.md). */
export function EseSim({ entrada, metas, categorias, onAplicar }: Props) {
  const [metaId, setMetaId] = useState(metas[0]?.id ?? '');
  const meta = metas.find((m) => m.id === metaId) ?? metas[0];
  const [categoriaId, setCategoriaId] = useState<string | undefined>();
  const [corte, setCorte] = useState(0);
  const [extra, setExtra] = useState(0);
  const [custo, setCusto] = useState<number | null>(null);

  const possiveis = useMemo(() => simularEse(entrada, { metaId: meta?.id ?? '', corte: 0, guardarAMais: 0 }).cortesPossiveis, [entrada, meta]);
  // Delivery é o primeiro da fila, como no design; sem ele, o maior Teto de Estilo de vida.
  const escolhida = possiveis.find((p) => p.categoriaId === categoriaId) ?? possiveis.find((p) => p.categoriaId === 'delivery') ?? possiveis[0];
  const maximoDoCorte = escolhida ? Math.floor(escolhida.maximo / PASSO_DO_CORTE) * PASSO_DO_CORTE : 0;
  const corteAtual = Math.min(corte, maximoDoCorte);
  const nomeDe = (id: string) => categorias.find((c) => c.id === id)?.nome ?? id;

  const faixa = meta ? faixaDoCusto(meta.valorAlvo, meta.valorAtual) : null;
  const custoAtual = meta && faixa ? Math.min(Math.max(custo ?? meta.valorAlvo, faixa.minimo), faixa.maximo) : 0;

  const cenario: Cenario = {
    metaId: meta?.id ?? '', categoriaId: escolhida?.categoriaId, corte: corteAtual, guardarAMais: extra,
    novoCusto: meta && custoAtual !== meta.valorAlvo ? custoAtual : undefined,
  };
  const r = useMemo(() => simularEse(entrada, cenario), [entrada, meta?.id, escolhida?.categoriaId, corteAtual, extra, custoAtual]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!meta || !r.meta || !faixa) {
    return (
      <main className="tela tela-detalhe">
        <Cabecalho linha1="E se…" linha2="o plano mudasse?" onVoltar={() => navegar('metas')} />
        <Folha>
          <section className="cartao" style={{ margin: 0 }}>
            <p style={{ margin: 0 }}>Para simular, crie primeiro uma Meta.</p>
            <button type="button" className="chip chip-novo" style={{ marginTop: 12 }} onClick={() => navegar('metas')}>Ir para as Metas</button>
          </section>
        </Folha>
      </main>
    );
  }

  const sim = r.meta;
  function aplicar() {
    onAplicar(cenario);
    setCorte(0); setExtra(0); setCusto(null);
  }

  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="E se…" linha2={`${sim.nome} chegasse antes?`} onVoltar={() => navegar('metas')}>
        <div className="ese-hero">
          <div className="sub">{sim.nome} chega em</div>
          <div className="num numero-grande" aria-live="polite">{sim.dataDepois ? mesCurto(sim.dataDepois) : 'sem previsão'}</div>
          <span className="ese-delta">{textoDaDiferenca(sim.mesesDeDiferenca)}</span>
        </div>
      </Cabecalho>
      <Folha>
        {metas.length > 1 && (
          <div className="chips-livres" role="radiogroup" aria-label="Meta simulada" style={{ marginBottom: 12 }}>
            {metas.map((m) => (
              <button key={m.id} type="button" role="radio" className="chip" aria-checked={m.id === meta.id} aria-pressed={m.id === meta.id}
                onClick={() => { setMetaId(m.id); setCusto(null); }}>{m.nome}</button>
            ))}
          </div>
        )}
        <section className="cartao ese-controles" style={{ margin: 0 }}>
          {escolhida && maximoDoCorte > 0 ? (
            <div className="ese-controle">
              <div className="ese-linha">
                <label htmlFor="corte">Cortar de {nomeDe(escolhida.categoriaId).toLowerCase()}</label>
                <span className="num"><Valor centavos={corteAtual} semCentavos />/mês</span>
              </div>
              <input id="corte" type="range" min={0} max={maximoDoCorte} step={PASSO_DO_CORTE} value={corteAtual} onChange={(e) => setCorte(Number(e.target.value))} />
              {possiveis.length > 1 && (
                <label className="rotulo">Categoria
                  <select className="seletor" value={escolhida.categoriaId} onChange={(e) => { setCategoriaId(e.target.value); setCorte(0); }}>
                    {possiveis.map((p) => <option key={p.categoriaId} value={p.categoriaId}>{nomeDe(p.categoriaId)}</option>)}
                  </select>
                </label>
              )}
            </div>
          ) : (
            <p className="rotulo" style={{ margin: 0 }}>Os Tetos aparecem depois do primeiro mês de Lançamentos. Aí dá para simular cortes.</p>
          )}
          <div className="ese-controle">
            <div className="ese-linha">
              <label htmlFor="extra">Guardar a mais</label>
              <span className="num"><Valor centavos={extra} semCentavos />/mês</span>
            </div>
            <input id="extra" type="range" min={0} max={MAXIMO_DO_EXTRA} step={PASSO_DO_EXTRA} value={extra} onChange={(e) => setExtra(Number(e.target.value))} />
          </div>
          <div className="ese-controle">
            <div className="ese-linha">
              <label htmlFor="custo">Valor da Meta</label>
              <span className="num"><Valor centavos={custoAtual} semCentavos /></span>
            </div>
            <input id="custo" type="range" min={faixa.minimo} max={faixa.maximo} step={faixa.passo} value={custoAtual} onChange={(e) => setCusto(Number(e.target.value))} />
          </div>
        </section>

        <section className="cartao-gelo ese-aporte" style={{ margin: '12px 0 0' }} aria-label="Aporte">
          <span className="texto-2">Aporte de {sim.nome}</span>
          <span className="num valor-gelo"><Valor centavos={r.aporteDepois} semCentavos />/mês</span>
        </section>
        <p className="rotulo" style={{ margin: '12px 8px 0', color: 'var(--tx3)' }}>
          Ao aplicar, a data vira o prazo da Meta e o corte passa a valer no Teto. O dinheiro a mais conta todo para esta Meta. Plano educativo, não é recomendação de investimento.
        </p>
        <div className="acao-fixa">
          <button type="button" className="botao-principal" onClick={aplicar}>
            Aplicar ao plano
            <span className="seta"><Icone nome="check" tamanho={18} traco={2} /></span>
          </button>
        </div>
      </Folha>
    </main>
  );
}
