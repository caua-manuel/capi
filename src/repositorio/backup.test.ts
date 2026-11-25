import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { gravarAjuste, lerAjuste } from './ajustes';
import { fecharBanco } from './banco';
import { ErroDeBackup, gerarArquivoDeBackup, restaurarArquivoDeBackup } from './backup';
import { gravarRegra, lerRegras } from './regras';
import { listarLancamentosDesde, salvarLancamento } from './lancamentos';
import { listarMetas, salvarMeta } from './metas';

const lancamento = { id: 'l1', valor: 4200, loja: 'iFood', categoriaId: 'delivery', data: '2026-11-10', origem: 'manual' as const, criadoEm: '2026-11-10T20:00:00Z' };
const meta = { id: 'm1', nome: 'Viagem', objetivo: 'viagem' as const, valorAlvo: 600000, valorAtual: 1000, prioridade: 2 as const, podeMexer: false };

async function limparTudo() {
  const { abrirBanco } = await import('./banco');
  const db = await abrirBanco();
  for (const nome of ['ajustes', 'lancamentos', 'regras', 'categorias', 'fixos', 'metas', 'faturas'] as const) await db.clear(nome);
}

describe('Backup', () => {
  afterEach(fecharBanco);

  async function semear() {
    await gravarAjuste('modo-discreto', true);
    await salvarLancamento(lancamento);
    await salvarMeta(meta);
    await gravarRegra('iFood', 'delivery');
  }

  it('exporta e restaura todas as entidades', async () => {
    await semear();
    const arquivo = await gerarArquivoDeBackup();
    await limparTudo();
    expect(await listarLancamentosDesde('2026-01')).toEqual([]);
    await restaurarArquivoDeBackup(arquivo);
    expect(await lerAjuste('modo-discreto')).toBe(true);
    expect(await listarLancamentosDesde('2026-01')).toEqual([lancamento]);
    expect(await listarMetas()).toEqual([meta]);
    expect(await lerRegras()).toEqual({ ifood: 'delivery' });
  });

  it('com senha o arquivo não deixa nada legível e só abre com a mesma senha', async () => {
    await semear();
    const arquivo = await gerarArquivoDeBackup('segredo-123');
    expect(arquivo).not.toContain('iFood');
    expect(JSON.parse(arquivo).cifrado).toBe(true);
    await limparTudo();
    await restaurarArquivoDeBackup(arquivo, 'segredo-123');
    expect(await listarLancamentosDesde('2026-01')).toEqual([lancamento]);
  });

  it('senha errada mostra erro claro e não apaga nada', async () => {
    await semear();
    const arquivo = await gerarArquivoDeBackup('certa');
    await gravarAjuste('depois-do-backup', 'continua aqui');
    await expect(restaurarArquivoDeBackup(arquivo, 'errada')).rejects.toThrow(ErroDeBackup);
    await expect(restaurarArquivoDeBackup(arquivo, 'errada')).rejects.toThrow(/senha/i);
    expect(await lerAjuste('depois-do-backup')).toBe('continua aqui');
    expect(await listarLancamentosDesde('2026-01')).toEqual([lancamento]);
  });

  it('arquivo cifrado sem senha pede a senha', async () => {
    await semear();
    const arquivo = await gerarArquivoDeBackup('certa');
    await expect(restaurarArquivoDeBackup(arquivo)).rejects.toThrow(/senha/i);
  });

  it('arquivo que não é do Capi é recusado sem apagar nada', async () => {
    await semear();
    await expect(restaurarArquivoDeBackup('{"qualquer":"coisa"}')).rejects.toThrow(ErroDeBackup);
    await expect(restaurarArquivoDeBackup('isto não é JSON')).rejects.toThrow(ErroDeBackup);
    expect(await listarLancamentosDesde('2026-01')).toEqual([lancamento]);
  });
});
