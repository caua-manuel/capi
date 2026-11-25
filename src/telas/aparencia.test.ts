import { describe, expect, it } from 'vitest';
import { resolverTema } from './aparencia';

describe('Aparência', () => {
  it('o padrão é o modo claro, mesmo quando o aparelho está no escuro', () => {
    expect(resolverTema(undefined, true)).toBe('claro');
  });

  it('Clara fica clara e Escura fica escura, seja qual for o aparelho', () => {
    expect(resolverTema('clara', true)).toBe('claro');
    expect(resolverTema('escura', false)).toBe('escuro');
  });

  it('Automática segue o aparelho', () => {
    expect(resolverTema('automatica', true)).toBe('escuro');
    expect(resolverTema('automatica', false)).toBe('claro');
  });

  it('um valor salvo desconhecido volta para o claro', () => {
    expect(resolverTema('roxo' as never, true)).toBe('claro');
  });
});
