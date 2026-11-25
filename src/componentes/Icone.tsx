// Ícones de traço do DESIGN.md: 1,6 a 2 px, cantos arredondados, sem preenchimento.
const caminhos = {
  mais: <path d="M12 5v14M5 12h14" />,
  seta: <path d="M5 12h14M13 6l6 6-6 6" />,
  check: <path d="M5 12l5 5 9-10" />,
  raio: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  lixo: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  olho: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  olhoFechado: <><path d="M3 3l18 18" /><path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3 3.6" /><path d="M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /></>,
  ajustes: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  voltar: <path d="M15 18l-6-6 6-6" />,
  lapis: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  sino: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
} as const;

export type NomeDoIcone = keyof typeof caminhos;

export function Icone({ nome, tamanho = 20, traco = 1.8 }: { nome: NomeDoIcone; tamanho?: number; traco?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={traco}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {caminhos[nome]}
    </svg>
  );
}
