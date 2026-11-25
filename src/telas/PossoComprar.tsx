import { useMemo, useState } from 'react';
import { CampoDinheiro } from '../componentes/CampoDinheiro';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import type { Categoria } from '../dominio/categorias';
import { avaliarCompra, type Compra, type Veredito } from '../motor/compra';
import type { Centavos } from '../motor/dinheiro';
import type { EntradaDoMotor } from '../motor';
import { Valor } from './discreto';
import { mesCurto } from './formato';
import { navegar } from './rotas';

interface Props {
  entrada: EntradaDoMotor;
  categorias: readonly Categoria[];
  onEsperar24h: (descricao: string, compra: Compra) => void;
}

const TITULO: Record<Veredito, string> = { cabe: 'Cabe no plano', aperta: 'Cabe, mas aperta', 'nao-cabe': 'Não cabe este mês' };
const CLASSE: Record<Veredito, string> = { cabe: 'estado-ok', aperta: 'estado-atencao', 'nao-cabe': 'estado-ruim' };

/** Tela de número: sem Capi (DESIGN.md). */
export function PossoComprar({ entrada, categorias, onEsperar24h }: Props) {
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState<Centavos | null>(null);
  const [parcelas, setParcelas] = useState(1);
  const [categoriaId, setCategoriaId] = useState('compras');
  const [guardada, setGuardada] = useState(false);

  const resposta = useMemo(
    () => (preco && preco > 0 ? avaliarCompra(entrada, { preco, parcelas, categoriaId }) : null),
    [entrada, preco, parcelas, categoriaId],
  );
  const atrasos = resposta?.metas.filter((m) => (m.mesesDeAtraso ?? 0) > 0) ?? [];

  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Posso comprar?" linha2="veja antes de pagar" onVoltar={() => navegar('inicio')} />
      <Folha>
        <section className="cartao linha-form" style={{ margin: 0 }}>
          <div className="campo"><input aria-label="O que você quer comprar" placeholder="O que é (ex.: tênis)" value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          <CampoDinheiro id="preco" rotulo="Preço" valor={preco} onMudar={setPreco} grande />
          <div className="segmentado" role="radiogroup" aria-label="Parcelamento">
            {[1, 2, 3, 6, 10, 12].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={parcelas === n} onClick={() => setParcelas(n)}>{n === 1 ? 'À vista' : `${n}x`}</button>
            ))}
          </div>
          <label className="rotulo">Categoria
            <select className="seletor" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
        </section>

        {resposta && (
          <>
            <section className={`cartao status ${CLASSE[resposta.veredito]}`} style={{ margin: '12px 0 0' }} aria-live="polite">
              <span className="rotulo-status">{TITULO[resposta.veredito]}</span>
              <ul className="lista-compra">
                <li>
                  <span>Neste mês</span>
                  <span className="num"><Valor centavos={resposta.valorNoMes} />{resposta.parcelasFuturas && <> + {resposta.parcelasFuturas.quantidade}x <Valor centavos={resposta.parcelasFuturas.valor} /></>}</span>
                </li>
                {resposta.teto && (
                  <li>
                    <span>Teto da Categoria</span>
                    <span className="num">sobra <Valor centavos={resposta.teto.restanteDepois} /></span>
                  </li>
                )}
                <li>
                  <span>Ainda pode gastar no mês</span>
                  <span className="num"><Valor centavos={resposta.limite.aindaDepois} /></span>
                </li>
                {resposta.previsao && (
                  <li>
                    <span>Previsão de fatura</span>
                    <span className="num"><Valor centavos={resposta.previsao.antes} /> → <Valor centavos={resposta.previsao.depois} /></span>
                  </li>
                )}
              </ul>
            </section>

            <section className="cartao" style={{ margin: '12px 0 0' }}>
              <h2 className="titulo">Nas suas Metas</h2>
              {atrasos.length === 0 ? (
                <p className="texto-2" style={{ margin: '4px 0 0' }}>Nenhuma Meta atrasa com essa compra.</p>
              ) : (
                <ul className="lista-compra">
                  {atrasos.map((m) => (
                    <li key={m.id}>
                      <span>{m.nome}</span>
                      <span>{m.mesesDeAtraso === 1 ? '1 mês' : `${m.mesesDeAtraso} meses`} depois{m.dataDepois ? ` (${mesCurto(m.dataDepois)})` : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button type="button" className="botao-secundario" disabled={guardada}
                onClick={() => { onEsperar24h(descricao.trim() || 'Compra', { preco: preco!, parcelas, categoriaId }); setGuardada(true); }}>
                {guardada ? 'Guardado: eu te lembro em 24 horas' : 'Esperar 24 horas antes de comprar'}
              </button>
            </div>
          </>
        )}
        <p className="rotulo" style={{ textAlign: 'center', margin: '16px 8px 0', color: 'var(--tx3)' }}>
          Simulação com os números de hoje. Plano educativo, não é recomendação de investimento.
        </p>
      </Folha>
    </main>
  );
}
