import { useState } from 'react';
import { CampoDinheiro } from '../componentes/CampoDinheiro';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { Icone } from '../componentes/Icone';
import type { Categoria } from '../dominio/categorias';
import type { Fixo, FormaDePagamento, VersaoDoFixo } from '../dominio/fixo';
import type { Centavos } from '../motor/dinheiro';
import { editarFixo, encerrarFixo, versaoNoMes } from '../motor/fixos';
import { Valor } from './discreto';
import { nomeDoMes } from './formato';
import { navegar } from './rotas';

interface Props {
  fixos: readonly Fixo[];
  /** Mês do plano atual, AAAA-MM: as edições valem a partir dele. */
  mes: string;
  categorias: readonly Categoria[];
  onSalvar: (fixo: Fixo) => void;
}

interface Rascunho {
  nome: string;
  valor: Centavos | null;
  dia: number;
  categoriaId: string;
  forma: FormaDePagamento;
}

function Formulario({ inicial, categorias, onConfirmar, onCancelar, onTirar }: {
  inicial: Rascunho; categorias: readonly Categoria[]; onConfirmar: (r: Rascunho) => void; onCancelar: () => void; onTirar?: () => void;
}) {
  const [r, setR] = useState(inicial);
  const valido = r.nome.trim() !== '' && r.valor !== null && r.valor > 0;
  return (
    <div className="linha-form" style={{ padding: '8px 0' }}>
      <div className="campo"><input aria-label="Nome do fixo" placeholder="Nome (ex.: Academia)" value={r.nome} onChange={(e) => setR({ ...r, nome: e.target.value })} /></div>
      <CampoDinheiro id="valor-fixo" rotulo="Valor por mês" valor={r.valor} onMudar={(valor) => setR({ ...r, valor })} />
      <div className="linha-dupla">
        <label className="rotulo">Categoria
          <select className="seletor" value={r.categoriaId} onChange={(e) => setR({ ...r, categoriaId: e.target.value })}>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </label>
        <label className="rotulo">Dia
          <input className="seletor num" type="number" min={1} max={31} value={r.dia}
            onChange={(e) => setR({ ...r, dia: Math.min(31, Math.max(1, Number(e.target.value) || 1)) })} />
        </label>
      </div>
      <div className="segmentado" role="radiogroup" aria-label="Forma de pagamento">
        <button type="button" role="radio" aria-checked={r.forma === 'cartao'} onClick={() => setR({ ...r, forma: 'cartao' })}>No cartão</button>
        <button type="button" role="radio" aria-checked={r.forma === 'fora'} onClick={() => setR({ ...r, forma: 'fora' })}>Fora do cartão</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="chip" style={{ flex: 1 }} onClick={onCancelar}>Cancelar</button>
        <button type="button" className="chip" aria-pressed="true" style={{ flex: 1 }} disabled={!valido} onClick={() => onConfirmar({ ...r, nome: r.nome.trim() })}>Salvar</button>
      </div>
      {onTirar && (
        <button type="button" className="botao-apagar" onClick={onTirar}><Icone nome="lixo" tamanho={18} /> Tirar do plano a partir deste mês</button>
      )}
    </div>
  );
}

export function Fixos({ fixos, mes, categorias, onSalvar }: Props) {
  const [editando, setEditando] = useState<string | null>(null);
  const vigentes = fixos
    .map((f) => ({ fixo: f, versao: versaoNoMes(f, mes) }))
    .filter((x): x is { fixo: Fixo; versao: VersaoDoFixo } => x.versao !== undefined)
    .sort((a, b) => a.versao.dia - b.versao.dia);
  const total = vigentes.reduce((s, x) => s + x.versao.valor, 0);
  const nomeDaCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? 'Outros';

  function salvar(fixo: Fixo | null, r: Rascunho) {
    const dados = { nome: r.nome, valor: r.valor ?? 0, dia: r.dia, categoriaId: r.categoriaId, forma: r.forma };
    onSalvar(fixo ? editarFixo(fixo, mes, dados) : { id: `fixo-${crypto.randomUUID()}`, versoes: [{ aPartirDe: mes, ...dados }] });
    setEditando(null);
  }

  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Fixos" linha2="entram sozinhos todo mês" onVoltar={() => navegar('ajustes')} />
      <Folha>
        <section className="cartao" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div>
              <h2 className="titulo">Em {nomeDoMes(mes)}</h2>
              <span className="rotulo num"><Valor centavos={total} /> no mês</span>
            </div>
            {editando !== 'novo' && <button type="button" className="chip chip-novo" onClick={() => setEditando('novo')}>+ Novo fixo</button>}
          </div>
          {editando === 'novo' && (
            <Formulario inicial={{ nome: '', valor: null, dia: 10, categoriaId: 'casa-contas', forma: 'fora' }} categorias={categorias}
              onConfirmar={(r) => salvar(null, r)} onCancelar={() => setEditando(null)} />
          )}
          {vigentes.length === 0 && editando !== 'novo' && (
            <p className="texto-2" style={{ margin: '8px 0 0' }}>Mensalidade do treino, celular, faculdade: cadastre uma vez e eles entram sozinhos todo mês.</p>
          )}
          <ul className="lista-categorias">
            {vigentes.map(({ fixo, versao }) => (
              <li key={fixo.id}>
                {editando === fixo.id ? (
                  <Formulario inicial={{ nome: versao.nome, valor: versao.valor, dia: versao.dia, categoriaId: versao.categoriaId, forma: versao.forma }}
                    categorias={categorias} onConfirmar={(r) => salvar(fixo, r)} onCancelar={() => setEditando(null)}
                    onTirar={() => { onSalvar(encerrarFixo(fixo, mes)); setEditando(null); }} />
                ) : (
                  <button type="button" className="item-lancamento" onClick={() => setEditando(fixo.id)}>
                    <span className="item-texto">
                      <span className="item-loja">{versao.nome}</span>
                      <span className="rotulo">Dia {versao.dia} · {nomeDaCategoria(versao.categoriaId)} · {versao.forma === 'cartao' ? 'no cartão' : 'fora do cartão'}</span>
                    </span>
                    <span className="num item-valor"><Valor centavos={versao.valor} /></span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
        <p className="rotulo" style={{ textAlign: 'center', margin: '16px 8px 0', color: 'var(--tx3)' }}>
          Mudanças valem a partir de {nomeDoMes(mes)}. Os meses que já passaram continuam como estavam.
        </p>
      </Folha>
    </main>
  );
}
