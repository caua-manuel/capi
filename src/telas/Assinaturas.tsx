import { Cabecalho, Folha } from '../componentes/Cabecalho';
import type { Recorrente } from '../motor/recorrentes';
import { Valor } from './discreto';
import { navegar } from './rotas';

/** Os Recorrentes que o Motor achou nas Faturas, com custo anual e destaques. */
export function Assinaturas({ recorrentes }: { recorrentes: readonly Recorrente[] }) {
  const total = recorrentes.reduce((s, r) => s + r.custoAnual, 0);
  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Assinaturas" linha2="o que se repete todo mês" onVoltar={() => navegar('ajustes')} />
      <Folha>
        {recorrentes.length === 0 ? (
          <section className="cartao" style={{ margin: 0 }}>
            <p className="texto-2" style={{ margin: 0 }}>As cobranças que se repetem aparecem aqui depois de importar 2 Faturas.</p>
          </section>
        ) : (
          <>
            <section className="cartao-gelo" style={{ margin: 0 }}>
              <div className="coluna-gelo">
                <span className="rotulo">Por ano</span>
                <span className="num valor-gelo"><Valor centavos={total} semCentavos /></span>
                <span className="rotulo">{recorrentes.length} {recorrentes.length === 1 ? 'cobrança' : 'cobranças'}</span>
              </div>
            </section>
            <section className="cartao lista" style={{ margin: '12px 0 0' }}>
              <ul>
                {recorrentes.map((r) => (
                  <li key={r.chave} className="item-lancamento" style={{ alignItems: 'flex-start' }}>
                    <span className="item-texto">
                      <span className="item-loja">{r.loja}</span>
                      <span className="rotulo">Dia {r.dia} · <Valor centavos={r.custoAnual} semCentavos /> por ano</span>
                      {r.duplicada && <span className="selo estado-ruim">Cobrada 2 vezes na última fatura</span>}
                      {r.aumento && <span className="selo estado-atencao">Subiu de <Valor centavos={r.valorAnterior} /> para <Valor centavos={r.valor} /></span>}
                      {r.emDolar && <span className="selo estado-atencao">Em dólar, com IOF</span>}
                      {r.nomeGenerico && <span className="selo estado-atencao">Nome genérico: confira o que é</span>}
                    </span>
                    <span className="num item-valor"><Valor centavos={r.valor} /></span>
                  </li>
                ))}
              </ul>
            </section>
            <p className="rotulo" style={{ margin: '12px 8px 0' }}>
              Para cancelar, abra a lista de assinaturas do celular. iPhone: Ajustes → seu nome → Assinaturas. Android: Play Store → Pagamentos e assinaturas.
            </p>
          </>
        )}
      </Folha>
    </main>
  );
}
