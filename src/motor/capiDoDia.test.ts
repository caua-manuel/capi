import { describe, expect, it } from 'vitest';
import type { Aviso } from './avisos';
import { capiDoDia } from './capiDoDia';

const hoje = '2026-11-24'; // terça-feira
const aviso = (parcial: Partial<Aviso> & Pick<Aviso, 'tipo'>) => ({ prioridade: 1, chave: 'x', ...parcial }) as Aviso;

describe('Capi do dia', () => {
  it('Aviso de Teto de Delivery escolhe o hambúrguer e leva para a Fatura', () => {
    const r = capiDoDia({ hoje, avisos: [aviso({ tipo: 'teto-80', categoriaId: 'delivery', gasto: 32000, teto: 40000, diasRestantes: 6 })] });
    expect(r).toMatchObject({ figurinha: 'hamburguer', destino: 'fatura' });
  });

  it('Meta perto escolhe a festa e leva para as Metas', () => {
    const r = capiDoDia({ hoje, avisos: [aviso({ tipo: 'meta-perto', metaId: '1', nome: 'Viagem', marco: 75, falta: 100000 })] });
    expect(r).toMatchObject({ figurinha: 'festa-chapeu', destino: 'metas' });
  });

  it('Anual chegando escolhe o presente e leva para o Calendário', () => {
    const r = capiDoDia({ hoje, avisos: [aviso({ tipo: 'anual-chegando', nome: 'IPVA', valor: 120000, data: '2026-12-20', caixinha: 60000 })] });
    expect(r).toMatchObject({ figurinha: 'presente', destino: 'calendario' });
  });

  it('domingo é dia de Check-in', () => {
    const r = capiDoDia({ hoje: '2026-11-22', avisos: [] });
    expect(r).toMatchObject({ figurinha: 'cama', destino: 'checkin' });
  });

  it('mês acima do plano usa uma frase sem culpa', () => {
    const r = capiDoDia({ hoje, avisos: [], aindaPodeGastar: -5000 });
    expect(r.figurinha).toBe('bateria-fraca');
    expect(r.frase).toMatch(/sem culpa/i);
  });

  it('a situação ganha do sorteio, e o Aviso de Delivery ganha da Meta', () => {
    const r = capiDoDia({
      hoje,
      avisos: [aviso({ tipo: 'meta-perto', metaId: '1', nome: 'Viagem', marco: 50, falta: 1 }), aviso({ tipo: 'teto-estourado', categoriaId: 'delivery', excesso: 5000 })],
    });
    expect(r.figurinha).toBe('hamburguer');
  });

  it('sem nada a dizer, sorteia pelo dia: igual no mesmo dia, sem número na frase e com destino', () => {
    const r = capiDoDia({ hoje, avisos: [] });
    expect(capiDoDia({ hoje, avisos: [] })).toEqual(r);
    expect(r.frase).not.toMatch(/\d/);
    expect(r.destino).toBeTruthy();
  });

  it('o sorteio muda de um dia para o outro', () => {
    const a = capiDoDia({ hoje: '2026-11-24', avisos: [] });
    const b = capiDoDia({ hoje: '2026-11-25', avisos: [] });
    expect(a.figurinha).not.toBe(b.figurinha);
  });
});
