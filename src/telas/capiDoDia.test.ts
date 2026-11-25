import { describe, expect, it } from 'vitest';
import { capiDoDia } from './capiDoDia';

describe('Capi do dia', () => {
  it('Aviso de Teto de Delivery escolhe o hambúrguer', () => {
    const r = capiDoDia({ hoje: '2026-11-24', avisos: [{ tipo: 'teto-80', prioridade: 2, chave: 'x', categoriaId: 'delivery', gasto: 32000, teto: 40000, diasRestantes: 6 }] });
    expect(r.imagem).toBe('dia-hamburguer.png');
  });

  it('Meta perto escolhe a festa', () => {
    const r = capiDoDia({ hoje: '2026-11-24', avisos: [{ tipo: 'meta-perto', prioridade: 6, chave: 'm', metaId: '1', nome: 'Viagem', marco: 80, falta: 100000 }] });
    expect(r.imagem).toBe('dia-festa-chapeu.png');
  });

  it('Sem nada a dizer, sorteia pelo dia e a frase não tem número', () => {
    const r = capiDoDia({ hoje: '2026-11-24', avisos: [] });
    expect(r.frase).not.toMatch(/\d/);
    expect(capiDoDia({ hoje: '2026-11-24', avisos: [] })).toEqual(r);
  });

  it('Tocar troca a figurinha', () => {
    const e = { hoje: '2026-11-24', avisos: [] };
    expect(capiDoDia(e, 1).imagem).not.toBe(capiDoDia(e, 0).imagem);
  });
});
