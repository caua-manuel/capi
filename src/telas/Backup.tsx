import { useState } from 'react';
import { Cabecalho, Folha } from '../componentes/Cabecalho';
import { Icone } from '../componentes/Icone';
import { ErroDeBackup, arquivoTemSenha, gerarArquivoDeBackup, restaurarArquivoDeBackup } from '../repositorio/backup';
import { navegar } from './rotas';

interface Props {
  hoje: string;
  /** Data do último backup exportado, AAAA-MM-DD. */
  ultimoBackup?: string;
  onExportou: () => void;
}

function baixar(nome: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const mensagemDe = (e: unknown) => (e instanceof ErroDeBackup ? e.message : 'Não consegui ler esse arquivo. Nada foi alterado.');

export function Backup({ hoje, ultimoBackup, onExportou }: Props) {
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [exportado, setExportado] = useState(false);
  const [erroDeExportar, setErroDeExportar] = useState('');

  const [arquivo, setArquivo] = useState<{ nome: string; texto: string; comSenha: boolean } | null>(null);
  const [senhaDoArquivo, setSenhaDoArquivo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [erroDeRestaurar, setErroDeRestaurar] = useState('');
  const [trabalhando, setTrabalhando] = useState(false);

  const senhasConferem = senha === confirmacao;

  async function exportar() {
    setErroDeExportar('');
    if (!senhasConferem) { setErroDeExportar('As duas senhas precisam ser iguais.'); return; }
    setTrabalhando(true);
    try {
      baixar(`capi-backup-${hoje}.json`, await gerarArquivoDeBackup(senha || undefined));
      onExportou();
      setExportado(true);
    } catch {
      setErroDeExportar('Não consegui gerar o backup. Tente de novo.');
    } finally {
      setTrabalhando(false);
    }
  }

  async function escolherArquivo(f: File | undefined) {
    setErroDeRestaurar('');
    setArquivo(null);
    setConfirmando(false);
    setSenhaDoArquivo('');
    if (!f) return;
    try {
      const texto = await f.text();
      setArquivo({ nome: f.name, texto, comSenha: arquivoTemSenha(texto) });
    } catch (e) {
      setErroDeRestaurar(mensagemDe(e));
    }
  }

  async function restaurar() {
    if (!arquivo) return;
    setErroDeRestaurar('');
    setTrabalhando(true);
    try {
      await restaurarArquivoDeBackup(arquivo.texto, arquivo.comSenha ? senhaDoArquivo : undefined);
      window.location.assign(import.meta.env.BASE_URL);
    } catch (e) {
      setErroDeRestaurar(mensagemDe(e));
      setConfirmando(false);
      setTrabalhando(false);
    }
  }

  const dias = ultimoBackup ? Math.max(0, Math.round((Date.parse(hoje) - Date.parse(ultimoBackup)) / 86400000)) : null;

  return (
    <main className="tela tela-detalhe">
      <Cabecalho linha1="Backup" linha2="só seu" onVoltar={() => navegar('ajustes')} />
      <Folha>
        <section className="cartao" style={{ margin: 0 }} aria-label="Exportar">
          <h2 className="titulo">Exportar backup</h2>
          <p className="rotulo" style={{ margin: '2px 0 10px' }}>
            {dias === null ? 'Você ainda não exportou.' : `Último há ${dias} ${dias === 1 ? 'dia' : 'dias'}.`} O arquivo fica com você; eu não envio nada para lugar nenhum.
          </p>
          <div className="linha-form">
            <label className="rotulo">Senha (opcional)
              <input className="seletor" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </label>
            {senha && (
              <label className="rotulo">Repita a senha
                <input className="seletor" type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
              </label>
            )}
            <p className="rotulo" style={{ margin: 0 }}>
              {senha ? 'Sem a senha o arquivo não abre, e eu não consigo recuperá-la.' : 'Sem senha, qualquer pessoa com o arquivo consegue ler seus gastos.'}
            </p>
            {erroDeExportar && <p role="alert" style={{ margin: 0, color: 'var(--bad)', fontWeight: 600 }}>{erroDeExportar}</p>}
            {exportado && <p role="status" style={{ margin: 0, color: 'var(--ok)', fontWeight: 600 }}>Backup exportado.</p>}
            <button type="button" className="botao-principal" disabled={trabalhando || (!!senha && !confirmacao)} onClick={exportar}>
              Exportar
              <span className="seta"><Icone nome="seta" tamanho={18} traco={2} /></span>
            </button>
          </div>
        </section>

        <section className="cartao" style={{ margin: '12px 0 0' }} aria-label="Restaurar">
          <h2 className="titulo">Restaurar backup</h2>
          <p className="rotulo" style={{ margin: '2px 0 10px' }}>Substitui os dados atuais pelos do arquivo.</p>
          <div className="linha-form">
            <label className="chip" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              Escolher arquivo
              <input type="file" accept=".json,application/json" className="so-leitor" onChange={(e) => void escolherArquivo(e.target.files?.[0])} />
            </label>
            {arquivo && <p className="rotulo" style={{ margin: 0, overflowWrap: 'anywhere' }}>Arquivo: {arquivo.nome}</p>}
            {arquivo?.comSenha && (
              <label className="rotulo">Senha do backup
                <input className="seletor" type="password" autoComplete="off" value={senhaDoArquivo} onChange={(e) => setSenhaDoArquivo(e.target.value)} />
              </label>
            )}
            {erroDeRestaurar && <p role="alert" style={{ margin: 0, color: 'var(--bad)', fontWeight: 600 }}>{erroDeRestaurar}</p>}
            {arquivo && !confirmando && (
              <button type="button" className="chip" aria-pressed="true" disabled={arquivo.comSenha && !senhaDoArquivo} onClick={() => setConfirmando(true)}>Restaurar</button>
            )}
            {arquivo && confirmando && (
              <div className="linha-form">
                <p style={{ margin: 0, fontWeight: 600 }}>Isso apaga os dados atuais e coloca os do arquivo no lugar. Quer continuar?</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="chip" style={{ flex: 1 }} onClick={() => setConfirmando(false)}>Cancelar</button>
                  <button type="button" className="chip" aria-pressed="true" style={{ flex: 1 }} disabled={trabalhando} onClick={restaurar}>Sim, restaurar</button>
                </div>
              </div>
            )}
          </div>
        </section>
        <p className="rotulo" style={{ margin: '12px 8px 0', color: 'var(--tx3)' }}>Seus dados ficam só neste aparelho. O backup é o único jeito de levá-los para outro.</p>
      </Folha>
    </main>
  );
}
