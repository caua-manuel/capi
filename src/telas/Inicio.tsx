import type { Categoria } from '../dominio/categorias';
import type { Lancamento } from '../dominio/lancamento';
import { Icone } from '../componentes/Icone';
import { formatarReais, nomeDoMes, rotuloDaData, saudacao } from './formato';

interface Props {
  mes: string;
  lancamentos: Lancamento[];
  /** Todas as Categorias, inclusive as escondidas, para nomear Lançamentos antigos. */
  categorias: readonly Categoria[];
  onLancar: () => void;
  onEditar: (lancamento: Lancamento) => void;
  onAjustes: () => void;
}

export function Inicio({ mes, lancamentos, categorias, onLancar, onEditar, onAjustes }: Props) {
  const total = lancamentos.reduce((soma, l) => soma + l.valor, 0);
  const nomeDaCategoria = (id: string) => categorias.find((c) => c.id === id)?.nome ?? 'Outros';
  const base = import.meta.env.BASE_URL;

  return (
    <>
      <main className="tela">
        <header style={{ padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src={`${base}apple-touch-icon.png`} alt="Capi" width={44} height={44}
            style={{ borderRadius: 11, boxShadow: '0 2px 8px rgba(11,21,48,.18)' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="botao-redondo" aria-label="Ajustes" onClick={onAjustes}>
              <Icone nome="ajustes" />
            </button>
          </div>
        </header>

        <div style={{ padding: '14px 22px 0' }}>
          <div className="texto-2">{saudacao()},</div>
          <h1 className="titulo-grande" style={{ textTransform: 'capitalize' }}>{nomeDoMes(mes)}</h1>
        </div>

        <section className="cartao-destaque" style={{ marginTop: 16 }}>
          <div className="sub">Gastos de {nomeDoMes(mes)}</div>
          <div className="num" style={{ fontSize: 44, fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.035em', marginTop: 4 }}>
            {formatarReais(total)}
          </div>
          <div className="sub" style={{ marginTop: 2 }}>
            {lancamentos.length === 1 ? '1 lançamento' : `${lancamentos.length} lançamentos`}
          </div>
        </section>

        {lancamentos.length === 0 ? (
          <section className="cartao" style={{ textAlign: 'center', padding: '24px 18px' }}>
            <img className="capi" src={`${base}capi/capi-caderno.png`} alt="" style={{ height: 120, margin: '0 auto' }} />
            <p className="titulo" style={{ marginTop: 12 }}>Nenhum gasto em {nomeDoMes(mes)} ainda.</p>
            <p className="texto-2" style={{ margin: '4px 0 0' }}>Toque no + e escreva algo como "ifood 42". Eu cuido do resto.</p>
          </section>
        ) : (
          <section className="cartao lista" aria-label={`Lançamentos de ${nomeDoMes(mes)}`}>
            <h2 className="titulo" style={{ paddingBottom: 6 }}>Lançamentos</h2>
            <ul>
              {lancamentos.map((l) => (
                <li key={l.id}>
                  <button type="button" className="item-lancamento" onClick={() => onEditar(l)}>
                    <span className="item-texto">
                      <span className="item-loja">{l.loja}</span>
                      <span className="rotulo">{nomeDaCategoria(l.categoriaId)} · {rotuloDaData(l.data)}</span>
                    </span>
                    <span className="num item-valor">{formatarReais(l.valor)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="rotulo" style={{ textAlign: 'center', margin: '16px 24px 0', color: 'var(--tx3)' }}>
          Este plano é educativo e não é recomendação de investimento.
        </p>
      </main>

      <div className="barra-fade" aria-hidden="true" />
      <nav className="barra" aria-label="Navegação">
        <button type="button" className="botao-lancar" aria-label="Lançar gasto" onClick={onLancar}>
          <Icone nome="mais" tamanho={24} traco={2} />
        </button>
      </nav>
    </>
  );
}
