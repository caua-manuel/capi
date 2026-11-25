import { useEffect, useMemo, useRef, useState } from 'react';
import type { Categoria, Grupo } from '../dominio/categorias';
import { FormNovaCategoria } from '../componentes/FormNovaCategoria';
import { normalizar } from '../leitor/normalizar';
import type { Lancamento, OrigemDoLancamento } from '../dominio/lancamento';
import { lerLancamento, sugerirCategoria, type LeituraDeLancamento, type RegrasDeEstabelecimento } from '../leitor/leitor';
import type { PendenteDoAtalho } from '../leitor/pushDoAtalho';
import { Icone } from '../componentes/Icone';
import { Valor, useModoDiscreto } from './discreto';
import { centavosParaTexto, hoje, mesDe, rotuloDaData } from './formato';
import { tetoDepoisDoGasto, type Plano } from '../motor/plano';
import { gerarParcelas } from '../motor/parcelas';

export interface PreenchimentoDoGasto {
  texto: string;
  origem: OrigemDoLancamento;
  pendente?: PendenteDoAtalho;
}

interface Props {
  /** Plano do mês, para mostrar como fica o Teto da Categoria. */
  plano?: Plano | null;
  /** Categorias que aparecem nos chips (as escondidas ficam de fora). */
  categorias: readonly Categoria[];
  regras: RegrasDeEstabelecimento;
  /** Lançamento em edição; sem ele, é um Novo gasto. */
  editando?: Lancamento;
  preenchimento?: PreenchimentoDoGasto;
  outrosPendentes?: number;
  /** `demais` são as Parcelas 2 em diante, quando a compra é parcelada. */
  onSalvar: (lancamento: Lancamento, demais?: Lancamento[]) => Promise<void>;
  onApagar?: (id: string) => Promise<void>;
  onFechar: () => void;
  /** Cria a Categoria ali mesmo, sem sair do lançamento, e devolve o id dela. */
  onCriarCategoria: (nome: string, grupo: Grupo) => Promise<string>;
}

export function NovoGasto({ plano, categorias, regras, editando, preenchimento, outrosPendentes = 0, onSalvar, onApagar, onFechar, onCriarCategoria }: Props) {
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const discreto = useModoDiscreto();
  const [focado, setFocado] = useState(false);
  const [texto, setTexto] = useState(
    editando ? `${editando.loja} ${centavosParaTexto(editando.valor)}` : (preenchimento?.texto ?? ''),
  );
  const [categoriaEscolhida, setCategoriaEscolhida] = useState<string | null>(editando?.categoriaId ?? null);
  const [data, setData] = useState(editando?.data ?? hoje());
  const [salvando, setSalvando] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const origem: OrigemDoLancamento = editando?.origem ?? preenchimento?.origem ?? 'manual';

  const leitura = useMemo<LeituraDeLancamento>(() => {
    if (preenchimento?.pendente && texto === preenchimento.texto) {
      const { valor, loja } = preenchimento.pendente;
      return { valor, loja, categoriaId: sugerirCategoria(loja, categorias, regras) };
    }
    return lerLancamento(texto, categorias, regras);
  }, [texto, categorias, regras, preenchimento]);
  const categoriaId = categoriaEscolhida ?? leitura.categoriaId;
  // Parcelar só vale para gasto novo: editar mexe numa Parcela só.
  const parcelas = !editando && leitura.parcelas ? leitura.parcelas : 1;
  const faltaConfirmarCategoria = Boolean(preenchimento?.pendente) && categoriaEscolhida === null;
  const pode = leitura.valor !== null && leitura.valor > 0 && categoriaId !== null && !faltaConfirmarCategoria && !salvando;

  const teto = useMemo(() => {
    if (!plano || categoriaId === null || !leitura.valor) return null;
    const mesmoTeto = editando && editando.categoriaId === categoriaId && mesDe(editando.data) === plano.mes;
    return tetoDepoisDoGasto(plano, categoriaId, leitura.valor, { valorAnterior: mesmoTeto ? editando.valor : 0, mesDaCompra: mesDe(data) });
  }, [plano, categoriaId, leitura.valor, editando, data]);

  useEffect(() => {
    if (!editando && !preenchimento) campo.current?.focus();
    const fecharNoEsc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', fecharNoEsc);
    return () => window.removeEventListener('keydown', fecharNoEsc);
  }, [editando, preenchimento, onFechar]);

  async function salvar() {
    if (!pode || leitura.valor === null || categoriaId === null) return;
    setSalvando(true);
    const base: Lancamento = {
      id: editando?.id ?? crypto.randomUUID(),
      valor: leitura.valor,
      loja: leitura.loja || 'Sem nome',
      categoriaId,
      data,
      origem,
      criadoEm: editando?.criadoEm ?? new Date().toISOString(),
    };
    const [primeira, ...demais] = gerarParcelas(base, parcelas, () => crypto.randomUUID());
    await onSalvar(primeira!, demais);
  }

  return (
    <div className="folha-fundo" onClick={onFechar}>
      <section className="folha" role="dialog" aria-modal="true" aria-label={editando ? 'Editar gasto' : 'Novo gasto'}
        onClick={(e) => e.stopPropagation()}>
        <div className="folha-alca" />
        <div className="folha-topo">
          <button type="button" className="link" onClick={onFechar}>Cancelar</button>
          <span className="titulo">{editando ? 'Editar gasto' : 'Novo gasto'}</span>
          <span style={{ width: 70 }} />
        </div>

        {origem === 'applepay' && (
          <span className="selo-applepay"><Icone nome="raio" tamanho={14} />Preenchido pelo Apple Pay</span>
        )}
        {outrosPendentes > 0 && (
          <span className="rotulo" role="status">mais {outrosPendentes} {outrosPendentes === 1 ? 'pagamento' : 'pagamentos'} para categorizar</span>
        )}

        <div style={{ textAlign: 'center' }}>
          <img className="capi" src={`${import.meta.env.BASE_URL}capi/capi-joinha.png`} alt="" style={{ height: 92, margin: '0 auto 4px' }} />
          <div className="num valor-grande" aria-live="polite">
            <Valor centavos={leitura.valor ?? 0} />
          </div>
          {parcelas > 1 && leitura.valor && (
            <div className="selo-parcelas" aria-live="polite">
              {parcelas}x de <Valor centavos={Math.floor(leitura.valor / parcelas)} />
            </div>
          )}
          <div className="texto-2" style={{ marginTop: 8 }}>
            {leitura.loja || 'Escreva a loja e o valor'} · {rotuloDaData(data)}
          </div>
        </div>

        <label htmlFor="texto-do-gasto" className="so-leitor">Escreva o gasto, por exemplo ifood 42</label>
        <div className="campo">
          <input id="texto-do-gasto" ref={campo} value={texto} onChange={(e) => setTexto(e.target.value)}
            className={discreto && !focado ? 'texto-escondido' : undefined}
            onFocus={() => setFocado(true)} onBlur={() => setFocado(false)}
            placeholder="ifood 42 ou pix joão 50" autoComplete="off" autoCapitalize="none" enterKeyHint="done"
            onKeyDown={(e) => e.key === 'Enter' && salvar()} />
          {leitura.valor !== null && <span className="entendi">entendi</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="rotulo" style={{ padding: '0 4px', fontSize: 13 }}>Categoria</span>
          {faltaConfirmarCategoria && <span className="rotulo">Toque em uma Categoria para confirmar.</span>}
          <div className="chips">
            {categorias.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={c.id === categoriaId}
                onClick={() => setCategoriaEscolhida(c.id)}>{c.nome}</button>
            ))}
            <button type="button" className="chip chip-novo" onClick={() => setCriandoCategoria(true)}>+ Nova categoria</button>
          </div>
          {teto && categoriaId !== null && (
            <p className={`linha-teto ${teto.estado}`} aria-live="polite">
              {categorias.find((c) => c.id === categoriaId)?.nome ?? 'Categoria'} vai para <Valor centavos={teto.gastoDepois} semCentavos /> de <Valor centavos={teto.teto} semCentavos />
              {teto.estado === 'estourado' ? ' (passa do Teto)' : ''}
            </p>
          )}
          {criandoCategoria && (
            <FormNovaCategoria rotuloDoBotao="Criar e usar"
              nomeJaExiste={(nome) => categorias.some((c) => normalizar(c.nome) === normalizar(nome))}
              onCancelar={() => setCriandoCategoria(false)}
              onConfirmar={async (nome, grupo) => {
                const id = await onCriarCategoria(nome, grupo);
                setCategoriaEscolhida(id);
                setCriandoCategoria(false);
              }} />
          )}
        </div>

        <label className="linha-data">
          <span className="rotulo" style={{ fontSize: 13 }}>Data da compra</span>
          <input type="date" value={data} max={hoje()} onChange={(e) => e.target.value && setData(e.target.value)} />
        </label>

        <button type="button" className="botao-principal" disabled={!pode} onClick={salvar}>
          {editando ? 'Salvar alterações' : 'Salvar gasto'}
          <span className="seta"><Icone nome="check" tamanho={18} traco={2} /></span>
        </button>
        {editando && onApagar && (
          <button type="button" className="botao-apagar" onClick={() => onApagar(editando.id)}>
            <Icone nome="lixo" tamanho={18} />Apagar gasto
          </button>
        )}
      </section>
    </div>
  );
}
