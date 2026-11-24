import { useState } from 'react';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { FormNovaCategoria } from '../componentes/FormNovaCategoria';
import { Icone } from '../componentes/Icone';
import { ID_OUTROS, NOMES_DOS_GRUPOS, type Categoria, type Grupo } from '../dominio/categorias';
import { normalizar } from '../leitor/normalizar';
import { navegar } from './rotas';

interface Props {
  todas: readonly Categoria[];
  escondidas: readonly string[];
  onAlternarEscondida: (id: string) => void;
  onCriar: (nome: string, grupo: Grupo) => void;
  onRenomear: (categoria: Categoria, nome: string, grupo: Grupo) => void;
  onApagar: (categoria: Categoria) => void;
}

export function Categorias({ todas, escondidas, onAlternarEscondida, onCriar, onRenomear, onApagar }: Props) {
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const proprias = todas.filter((c) => !c.padrao);
  const padrao = todas.filter((c) => c.padrao);
  const nomeJaExiste = (nome: string) => todas.some((c) => normalizar(c.nome) === normalizar(nome));

  function apagar(categoria: Categoria) {
    if (window.confirm(`Apagar "${categoria.nome}"? Os gastos dela vão para Outros.`)) onApagar(categoria);
  }

  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Categorias" linha2="do seu jeito" onVoltar={() => navegar('ajustes')} />
      <Folha>
        <section className="cartao" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="titulo">Suas categorias</h2>
            {!criando && <button type="button" className="chip chip-novo" onClick={() => setCriando(true)}>+ Nova categoria</button>}
          </div>
          {criando && (
            <div style={{ marginTop: 12 }}>
              <FormNovaCategoria rotuloDoBotao="Criar" nomeJaExiste={nomeJaExiste}
                onConfirmar={(nome, grupo) => { onCriar(nome, grupo); setCriando(false); }} onCancelar={() => setCriando(false)} />
            </div>
          )}
          {proprias.length === 0 && !criando && (
            <p className="texto-2" style={{ margin: '8px 0 0' }}>Crie categorias como Pet ou Moto para os gastos que não cabem nas padrão.</p>
          )}
          <ul className="lista-categorias">
            {proprias.map((c) => (
              <li key={c.id}>
                {editandoId === c.id ? (
                  <FormNovaCategoria nomeInicial={c.nome} grupoInicial={c.grupo} rotuloDoBotao="Salvar" nomeJaExiste={nomeJaExiste}
                    onConfirmar={(nome, grupo) => { onRenomear(c, nome, grupo); setEditandoId(null); }} onCancelar={() => setEditandoId(null)} />
                ) : (
                  <div className="linha-categoria">
                    <span className="item-texto">
                      <span className="item-loja">{c.nome}</span>
                      <span className="rotulo">{NOMES_DOS_GRUPOS[c.grupo]}</span>
                    </span>
                    <span style={{ display: 'flex', gap: 4 }}>
                      <button type="button" className="botao-icone" aria-label={`Renomear ${c.nome}`} onClick={() => setEditandoId(c.id)}>
                        <Icone nome="lapis" tamanho={18} />
                      </button>
                      <button type="button" className="botao-icone" aria-label={`Apagar ${c.nome}`} onClick={() => apagar(c)}
                        style={{ color: 'var(--bad)' }}>
                        <Icone nome="lixo" tamanho={18} />
                      </button>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao" style={{ margin: '12px 0 0' }}>
          <h2 className="titulo">Padrão</h2>
          <p className="rotulo" style={{ margin: '4px 0 0' }}>Escondidas não aparecem no lançamento, mas os gastos antigos continuam contando.</p>
          <ul className="lista-categorias">
            {padrao.map((c) => {
              const visivel = c.id === ID_OUTROS || !escondidas.includes(c.id);
              return (
                <li key={c.id}>
                  <label className="linha-categoria">
                    <span className="item-texto">
                      <span className="item-loja">{c.nome}</span>
                      <span className="rotulo">{NOMES_DOS_GRUPOS[c.grupo]}</span>
                    </span>
                    <input type="checkbox" role="switch" className="interruptor" checked={visivel}
                      disabled={c.id === ID_OUTROS} onChange={() => onAlternarEscondida(c.id)}
                      aria-label={`Mostrar ${c.nome} no lançamento`} />
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      </Folha>
    </main>
  );
}
