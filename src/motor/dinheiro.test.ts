import { describe, expect, it } from 'vitest';
import type { Centavos } from './dinheiro';

describe('Dinheiro', () => {
  it('soma centavos inteiros sem erro de ponto flutuante', () => {
    const a: Centavos = 10;
    const b: Centavos = 20;
    expect(a + b).toBe(30);
  });
});
