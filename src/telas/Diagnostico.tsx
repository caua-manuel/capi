import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { Icone } from '../componentes/Icone';
import type { Diagnostico as DadosDoDiagnostico, Status } from '../motor/diagnostico';
import { Valor } from './discreto';

const CLASSE_DO_STATUS: Record<Status, string> = { vermelho: 'estado-ruim', amarelo: 'estado-atencao', verde: 'estado-ok', azul: 'estado-azul' };

const pct = (v: number) => `${Math.round(v * 100)}%`;
function folego(meses: number): string {
  if (!Number.isFinite(meses)) return 'mais de 99';
  return meses.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

interface Props {
  diagnostico: DadosDoDiagnostico;
  onVoltar: () => void;
  onContinuar: () => void;
}

export function Diagnostico({ diagnostico: d, onVoltar, onContinuar }: Props) {
  const linhas: [string, number, number][] = [
    ['Essencial', d.divisao.essencial, d.divisaoIdeal.essencial],
    ['Estilo de vida', d.divisao.estiloDeVida, d.divisaoIdeal.estiloDeVida],
    ['Guardar', d.divisao.guardar, d.divisaoIdeal.guardar],
  ];
  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Seu diagnóstico" linha2="em 4 números" onVoltar={onVoltar} capi="capi-lupa.png" />
      <Folha>
        <section className={`cartao status ${CLASSE_DO_STATUS[d.status]}`} style={{ margin: 0 }}>
          <span className="rotulo-status">Status {d.status}</span>
          <p className="titulo" style={{ marginTop: 4 }}>{d.mensagem}</p>
        </section>

        <section className="cartao-gelo" aria-label="Visão geral">
          <div className="coluna-gelo">
            <span className="rotulo">Sobra</span>
            <span className="num valor-gelo"><Valor centavos={d.sobra} semCentavos /></span>
            <span className="rotulo">por mês</span>
          </div>
          <div className="coluna-gelo">
            <span className="rotulo">Poupança</span>
            <span className="num valor-gelo">{pct(d.taxaDePoupanca)}</span>
            <span className="rotulo">da renda</span>
          </div>
          <div className="coluna-gelo">
            <span className="rotulo">Fôlego</span>
            <span className="num valor-gelo">{folego(d.mesesDeFolego)}</span>
            <span className="rotulo">{d.mesesDeFolego === 1 ? 'mês' : 'meses'} de reserva</span>
          </div>
        </section>

        <section className="cartao" style={{ margin: '12px 0 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 className="titulo">Regra {d.divisaoIdeal.essencial}-{d.divisaoIdeal.estiloDeVida}-{d.divisaoIdeal.guardar}</h2>
            <span className="rotulo">seu mês / ideal</span>
          </div>
          <ul className="lista-divisao">
            {linhas.map(([nome, real, ideal]) => {
              const passou = nome === 'Guardar' ? real * 100 < ideal : real * 100 > ideal;
              return (
                <li key={nome}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{nome}</span>
                    <span className="num"><strong style={{ fontWeight: 600 }}>{pct(real)}</strong> <span className="texto-2">/{ideal}</span></span>
                  </div>
                  <div className="barra-progresso" aria-hidden="true">
                    <div className={passou ? 'atencao' : ''} style={{ width: `${Math.min(100, Math.max(0, real * 100))}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="rotulo" style={{ margin: '10px 0 0' }}>
            Reserva ideal para você: {d.mesesDeReservaRecomendados} meses de custo de vida, <Valor centavos={d.reservaRecomendada} />.
          </p>
        </section>

        {d.sinais.length > 0 && (
          <section className="cartao" style={{ margin: '12px 0 0' }}>
            <h2 className="titulo">Onde o dinheiro vaza</h2>
            <ul className="lista-sinais">
              {d.sinais.map((s) => <li key={s.tipo + s.texto}>{s.texto}</li>)}
            </ul>
          </section>
        )}

        {d.fonteDosVariaveis === 'estimativa' && (
          <p className="rotulo" style={{ margin: '12px 8px 0' }}>
            Os gastos do dia a dia ainda são a sua estimativa. Com os lançamentos do mês, os números ficam mais certos.
          </p>
        )}

        <div style={{ marginTop: 20 }}>
          <button type="button" className="botao-principal" onClick={onContinuar}>
            Ir para o início
            <span className="seta"><Icone nome="seta" tamanho={18} traco={2} /></span>
          </button>
        </div>
        <p className="rotulo" style={{ textAlign: 'center', margin: '14px 8px 0', color: 'var(--tx3)' }}>
          Plano educativo. Não é recomendação de investimento.
        </p>
      </Folha>
    </main>
  );
}
