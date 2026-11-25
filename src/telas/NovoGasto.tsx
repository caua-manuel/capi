import { useEffect, useMemo, useRef, useState } from 'react';
import type { Categoria, Grupo } from '../dominio/categorias';
import { FormNovaCategoria } from '../componentes/FormNovaCategoria';
import { normalizar } from '../leitor/normalizar';
import type { Lancamento, OrigemDoLancamento } from '../dominio/lancamento';
import { lerLancamento, type RegrasDeEstabelecimento } from '../leitor/leitor';
import { Icone } from '../componentes/Icone';
import { Valor, useModoDiscreto } from './discreto';
import { centavosParaTexto, hoje, rotuloDaData } from './formato';

export interface PreenchimentoDoGasto {
  texto: string;
  origem: OrigemDoLancamento;
}

interface Props {
  /** Categorias que aparecem nos chips (as escondidas ficam de fora). */
  categorias: readonly Categoria[];
  regras: RegrasDeEstabelecimento;
  /** Lançamento em edição; sem ele, é um Novo gasto. */
  editando?: Lancamento;
  preenchimento?: PreenchimentoDoGasto;
  onSalvar: (lancamento: Lancamento) => Promise<void>;
  onApagar?: (id: string) => Promise<void>;
  onFechar: () => void;
  /** Cria a Categoria ali mesmo, sem sair do lançamento, e devolve o id dela. */
  onCriarCategoria: (nome: string, grupo: Grupo) => Promise<string>;
}

export function NovoGasto({ categorias, regras, editando, preenchimento, onSalvar, onApagar, onFechar, onCriarCategoria }: Props) {
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

  const leitura = useMemo(() => lerLancamento(texto, categorias, regras), [texto, categorias, regras]);
  const categoriaId = categoriaEscolhida ?? leitura.categoriaId;
  const pode = leitura.valor !== null && leitura.valor > 0 && categoriaId !== null && !salvando;

  useEffect(() => {
    if (!editando && !preenchimento) campo.current?.focus();
    const fecharNoEsc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', fecharNoEsc);
    return () => window.removeEventListener('keydown', fecharNoEsc);
  }, [editando, preenchimento, onFechar]);

  async function salvar() {
    if (!pode || leitura.valor === null || categoriaId === null) return;
    setSalvando(true);
    await onSalvar({
      id: editando?.id ?? crypto.randomUUID(),
      valor: leitura.valor,
      loja: leitura.loja || 'Sem nome',
      categoriaId,
      data,
      origem,
      criadoEm: editando?.criadoEm ?? new Date().toISOString(),
    });
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

        <div style={{ textAlign: 'center' }}>
          <img className="capi" src={`${import.meta.env.BASE_URL}capi/capi-joinha.png`} alt="" style={{ height: 92, margin: '0 auto 4px' }} />
          <div className="num valor-grande" aria-live="polite">
            <Valor centavos={leitura.valor ?? 0} />
          </div>
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
          <div className="chips">
            {categorias.map((c) => (
              <button key={c.id} type="button" className="chip" aria-pressed={c.id === categoriaId}
                onClick={() => setCategoriaEscolhida(c.id)}>{c.nome}</button>
            ))}
            <button type="button" className="chip chip-novo" onClick={() => setCriandoCategoria(true)}>+ Nova categoria</button>
          </div>
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
