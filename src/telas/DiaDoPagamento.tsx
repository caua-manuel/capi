import type { MetaNaEscada } from '../motor/metas';
import type { Centavos } from '../motor/dinheiro';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { Icone } from '../componentes/Icone';
import { Valor } from './discreto';
import { nomeDoMes } from './formato';
import { navegar } from './rotas';

interface Props {
  /** AAAA-MM do mês do pagamento. */
  mes: string;
  guardarPorMes: Centavos;
  /** As Metas que recebem Aporte neste mês, na ordem da escada. */
  aportes: readonly MetaNaEscada[];
  jaSeparou: boolean;
  onSeparei: () => void;
}

/** Tela de número: sem Capi (DESIGN.md). */
export function DiaDoPagamento({ mes, guardarPorMes, aportes, jaSeparou, onSeparei }: Props) {
  const comAporte = aportes.filter((m) => m.aporte > 0);
  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Dia do pagamento" linha2={`separe primeiro, ${nomeDoMes(mes)}`} onVoltar={() => navegar('inicio')} />
      <Folha>
        <section className="cartao-destaque" style={{ margin: 0 }}>
          <div className="sub">Para guardar este mês</div>
          <div className="num numero-grande" style={{ overflowWrap: 'anywhere' }}><Valor centavos={guardarPorMes} /></div>
        </section>
        {comAporte.length === 0 ? (
          <section className="cartao" style={{ margin: '12px 0 0' }}>
            <p className="texto-2" style={{ margin: 0 }}>Nenhuma Meta recebe Aporte neste mês. Crie uma em Metas para dar destino a esse dinheiro.</p>
          </section>
        ) : (
          <section className="cartao" style={{ margin: '12px 0 0' }} aria-label="Para onde vai">
            <h2 className="titulo">Para onde vai</h2>
            <ul className="lista-compra">
              {comAporte.map((m) => (
                <li key={m.id}><span style={{ overflowWrap: 'anywhere' }}>{m.nome}</span><span className="num"><Valor centavos={m.aporte} /></span></li>
              ))}
            </ul>
          </section>
        )}
        <div style={{ marginTop: 16 }}>
          <button type="button" className="botao-principal" disabled={jaSeparou} onClick={onSeparei}>
            {jaSeparou ? 'Já separei este mês' : 'Já separei'}
            <span className="seta"><Icone nome="check" tamanho={18} traco={2} /></span>
          </button>
        </div>
        <p className="rotulo" style={{ margin: '12px 8px 0', textAlign: 'center', color: 'var(--tx3)' }}>
          Este plano é educativo e não é recomendação de investimento.
        </p>
      </Folha>
    </main>
  );
}
