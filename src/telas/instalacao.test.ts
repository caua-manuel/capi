import { describe, expect, it } from 'vitest';
import { precisaInstalar, proximaEtapa, type Ambiente } from './instalacao';

const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const SAFARI_IPAD_COMO_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const CHROME_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const CHROME_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SAFARI_MAC = SAFARI_IPAD_COMO_MAC;

const ambiente = (parcial: Partial<Ambiente>): Ambiente => ({
  userAgent: SAFARI_IPHONE, plataforma: 'iPhone', pontosDeToque: 5, standaloneDoIOS: false, modoDeExibicaoStandalone: false, ...parcial,
});

describe('Instalar antes de começar: quando aparece', () => {
  it('aparece no Safari do iPhone, fora da Tela de Início', () => {
    expect(precisaInstalar(ambiente({}))).toBe(true);
  });

  it('aparece no Safari do iPad, que se apresenta como Mac mas tem tela de toque', () => {
    expect(precisaInstalar(ambiente({ userAgent: SAFARI_IPAD_COMO_MAC, plataforma: 'MacIntel', pontosDeToque: 5 }))).toBe(true);
  });

  it('não aparece quando o app foi aberto pelo ícone (navigator.standalone)', () => {
    expect(precisaInstalar(ambiente({ standaloneDoIOS: true }))).toBe(false);
  });

  it('não aparece quando o app foi aberto pelo ícone (display-mode: standalone)', () => {
    expect(precisaInstalar(ambiente({ modoDeExibicaoStandalone: true }))).toBe(false);
  });

  it('não aparece em outros navegadores do iPhone', () => {
    expect(precisaInstalar(ambiente({ userAgent: CHROME_IPHONE }))).toBe(false);
  });

  it('não aparece no Android nem no computador', () => {
    expect(precisaInstalar(ambiente({ userAgent: CHROME_ANDROID, plataforma: 'Linux armv8l' }))).toBe(false);
    expect(precisaInstalar(ambiente({ userAgent: CHROME_DESKTOP, plataforma: 'Win32', pontosDeToque: 0 }))).toBe(false);
    expect(precisaInstalar(ambiente({ userAgent: SAFARI_MAC, plataforma: 'MacIntel', pontosDeToque: 0 }))).toBe(false);
  });
});

describe('Instalar antes de começar: os dois caminhos', () => {
  it('"Já instalei" não libera o navegador: só manda abrir pelo ícone', () => {
    expect(proximaEtapa('orientacao', 'ja-instalei')).toEqual({ etapa: 'ja-instalei', dispensar: false });
    expect(proximaEtapa('ja-instalei', 'voltar')).toEqual({ etapa: 'orientacao', dispensar: false });
  });

  it('"Continuar no navegador" pede confirmação antes de liberar', () => {
    expect(proximaEtapa('orientacao', 'continuar')).toEqual({ etapa: 'confirmar', dispensar: false });
    expect(proximaEtapa('confirmar', 'voltar')).toEqual({ etapa: 'orientacao', dispensar: false });
  });

  it('só a confirmação libera o uso no navegador', () => {
    expect(proximaEtapa('confirmar', 'continuar')).toEqual({ etapa: 'confirmar', dispensar: true });
  });
});
