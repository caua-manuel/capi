import { describe, expect, it } from 'vitest';
import { lerUrlDeEntrada } from './url';

describe('URL de entrada do lançamento (ADR 0003)', () => {
  it('lê valor, Loja e origem applepay', () => {
    expect(lerUrlDeEntrada('?valor=42.50&loja=iFood&origem=applepay')).toEqual({ valor: 4250, loja: 'iFood', origem: 'applepay' });
  });

  it('aceita o valor como o Atalhos manda, com R$ e vírgula', () => {
    expect(lerUrlDeEntrada('?valor=R%24%201.234%2C56&loja=Loja')?.valor).toBe(123456);
  });

  it('Loja com acento e espaço chega correta', () => {
    expect(lerUrlDeEntrada('?valor=10&loja=Padaria%20S%C3%A3o%20Jos%C3%A9')?.loja).toBe('Padaria São José');
  });

  it('Loja com + no lugar de espaço chega correta', () => {
    expect(lerUrlDeEntrada('?valor=10&loja=Caf%C3%A9+do+Ponto')?.loja).toBe('Café do Ponto');
  });

  it('origem ausente ou desconhecida vira manual', () => {
    expect(lerUrlDeEntrada('?valor=10')?.origem).toBe('manual');
    expect(lerUrlDeEntrada('?valor=10&origem=hacker')?.origem).toBe('manual');
  });

  it('valor inválido vira nulo, sem quebrar', () => {
    expect(lerUrlDeEntrada('?valor=abc&loja=X')).toEqual({ valor: null, loja: 'X', origem: 'manual' });
  });

  it('sem nenhum parâmetro do contrato devolve nulo', () => {
    expect(lerUrlDeEntrada('')).toBeNull();
    expect(lerUrlDeEntrada('?utm=1')).toBeNull();
  });

  it('Loja muito longa é cortada em 60 caracteres', () => {
    expect(lerUrlDeEntrada(`?loja=${'a'.repeat(200)}`)?.loja).toHaveLength(60);
  });
});
