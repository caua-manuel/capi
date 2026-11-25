import type { RespostasDoOnboarding } from '../dominio/onboarding';
import { gravarAjuste, lerAjuste } from './ajustes';

const CHAVE = 'onboarding';

export function lerOnboarding(): Promise<RespostasDoOnboarding | undefined> {
  return lerAjuste<RespostasDoOnboarding>(CHAVE);
}

export function gravarOnboarding(respostas: RespostasDoOnboarding): Promise<void> {
  return gravarAjuste(CHAVE, respostas);
}
