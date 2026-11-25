import { useState } from 'react';
import { NOMES_DOS_GRUPOS, type Grupo } from '../dominio/categorias';

interface Props {
  nomeInicial?: string;
  grupoInicial?: Grupo;
  rotuloDoBotao: string;
  nomeJaExiste: (nome: string) => boolean;
  onConfirmar: (nome: string, grupo: Grupo) => void;
  onCancelar: () => void;
}

const GRUPOS = Object.keys(NOMES_DOS_GRUPOS) as Grupo[];

export function FormNovaCategoria({ nomeInicial = '', grupoInicial = 'estilo-de-vida', rotuloDoBotao, nomeJaExiste, onConfirmar, onCancelar }: Props) {
  const [nome, setNome] = useState(nomeInicial);
  const [grupo, setGrupo] = useState<Grupo>(grupoInicial);
  const limpo = nome.replace(/\s+/g, ' ').trim();
  const repetido = limpo !== '' && limpo.toLowerCase() !== nomeInicial.trim().toLowerCase() && nomeJaExiste(limpo);
  const pode = limpo.length > 0 && limpo.length <= 30 && !repetido;

  return (
    <form className="form-categoria" onSubmit={(e) => { e.preventDefault(); if (pode) onConfirmar(limpo, grupo); }}>
      <label className="so-leitor" htmlFor="nome-da-categoria">Nome da categoria</label>
      <div className="campo">
        <input id="nome-da-categoria" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Pet, Moto, Presentes…"
          maxLength={30} autoFocus autoComplete="off" enterKeyHint="done" />
      </div>
      {repetido && <span className="rotulo" style={{ color: 'var(--bad)' }}>Já existe uma categoria com esse nome.</span>}
      <div className="segmentado" role="radiogroup" aria-label="Grupo">
        {GRUPOS.map((g) => (
          <button key={g} type="button" role="radio" aria-checked={g === grupo} onClick={() => setGrupo(g)}>
            {NOMES_DOS_GRUPOS[g]}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="chip" onClick={onCancelar}>Cancelar</button>
        <button type="submit" className="chip" aria-pressed="true" disabled={!pode}>{rotuloDoBotao}</button>
      </div>
    </form>
  );
}
