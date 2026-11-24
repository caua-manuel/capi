---
name: Capi
description: Assistente de finanças de bolso com a mascote Capi. Visual de app nativo de iPhone, azul-marinho e azul-gelo.
colors:
  fundo: "#F1F3F7"
  superficie: "#FFFFFF"
  superficie-2: "#EEF1F6"
  texto: "#0D1730"
  texto-2: "#454F64"
  texto-3: "#535E74"
  linha: "#E6EAF1"
  marinho-claro: "#1E2E57"
  marinho: "#0B1530"
  texto-sobre-marinho: "#AFBCD8"
  destaque-sobre-marinho: "#A9C2FA"
  gelo-1: "#E3ECFC"
  gelo-2: "#CCDCF7"
  azul: "#2E5BDB"
  azul-suave: "#E6EDFC"
  ok: "#147A4C"
  ok-fundo: "#E2F4EA"
  atencao: "#94600A"
  atencao-fundo: "#FBF0DA"
  ruim: "#9E302A"
  ruim-fundo: "#FBE6E3"
  escuro-fundo: "#080C17"
  escuro-superficie: "#121A2C"
  escuro-superficie-2: "#1A2338"
  escuro-texto: "#EEF2FA"
  escuro-texto-2: "#9CA8C0"
  escuro-texto-3: "#8792AA"
  escuro-azul: "#8FAAFF"
typography:
  numero-grande:
    fontFamily: "-apple-system, SF Pro Display, Inter, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
    fontFeature: "tnum"
  titulo-grande:
    fontFamily: "-apple-system, SF Pro Display, Inter, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.025em"
  titulo:
    fontFamily: "-apple-system, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  corpo:
    fontFamily: "-apple-system, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  rotulo:
    fontFamily: "-apple-system, SF Pro Text, Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  chip: "22px"
  cartao: "26px"
  destaque: "28px"
  folha: "30px"
  botao: "32px"
  barra: "34px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  botao-principal:
    backgroundColor: "{colors.marinho}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.botao}"
    height: "64px"
    padding: "0 12px 0 22px"
  botao-secundario:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.botao}"
    height: "64px"
  cartao:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.cartao}"
    padding: "18px"
  cartao-gelo:
    backgroundColor: "{colors.gelo-1}"
    textColor: "{colors.texto}"
    rounded: "{rounded.cartao}"
    padding: "18px 8px"
  cartao-destaque:
    backgroundColor: "{colors.marinho}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.destaque}"
    padding: "20px 22px"
  chip:
    backgroundColor: "{colors.superficie-2}"
    textColor: "{colors.texto}"
    rounded: "{rounded.chip}"
    height: "44px"
    padding: "0 16px"
  chip-selecionado:
    backgroundColor: "{colors.marinho}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.chip}"
    height: "44px"
  botao-lancar:
    backgroundColor: "{colors.azul}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.chip}"
    size: "52px"
---

# Design do Capi

As telas de referência estão no canvas "Capi — telas do app" (Claude Design) e copiadas em `design/telas/`. Os arquivos da mascote estão em `design/capi/`.

## Visão geral

Um app de finanças com cara de app nativo de iPhone: calmo, limpo e confiável, com uma mascote carismática que conversa com a pessoa sem dar bronca. O visual segue três ideias:
- **Marinho para o que importa.** O número principal da tela fica num cartão ou cabeçalho azul-marinho com degradê.
- **Gelo para resumos.** Blocos de visão geral usam degradê azul-gelo com colunas separadas por linhas finas.
- **Branco para o resto.** Cartões brancos com sombra suave, sem borda.

O tom é direto, com número e sem culpa: "Delivery em 80% do teto e faltam 12 dias", nunca "Você gastou demais!".

## Cores

- **Marinho** (`#0B1530` a `#1E2E57`, em degradê de 160°): cartão de destaque, cabeçalhos escuros, botão principal, aba ativa e chip selecionado.
- **Azul-gelo** (`#E3ECFC` a `#CCDCF7`): blocos de visão geral (fatura prevista, diagnóstico, dinheiro salvo).
- **Azul** (`#2E5BDB`): ação de lançar, links, barras de progresso e ícone do primeiro atalho.
- **Destaque sobre marinho** (`#A9C2FA`): segunda linha dos títulos dos cabeçalhos escuros.
- **Estados:** ok (verde), atenção (âmbar) e ruim (vermelho), sempre com o fundo claro correspondente. São usados só para estado de teto, semáforo do Diagnóstico e resultado do "Posso comprar?". Nunca como decoração.
- **Tema escuro:** mesma estrutura, com fundo `#080C17`, superfícies `#121A2C`/`#1A2338` e azul `#8FAAFF`. O cartão de destaque continua marinho, um pouco mais claro.
- Todo texto passa de 4,5:1 de contraste nos dois temas, inclusive os rótulos de 12 px.

## Tipografia

- Fonte do sistema (SF Pro no iPhone). Inter é só a alternativa fora do iPhone.
- Números sempre com algarismos tabulares (`font-variant-numeric: tabular-nums`) e espaçamento negativo nos tamanhos grandes.
- Hierarquia por peso e tamanho: títulos 600, corpo 400, rótulos 500. Não usar 700 ou 800.
- Títulos dos cabeçalhos escuros em duas linhas: a primeira branca e a segunda em azul-claro. Exemplo: "Fatura de janeiro / prevista".

## Layout

- Tela base de 390 px de largura, com margem lateral de 16 px nos cartões e 22–24 px nos textos soltos.
- Espaço de 12 px entre cartões.
- Telas de detalhe: cabeçalho marinho com altura de 250 a 330 px e o conteúdo subindo por cima numa folha arredondada (30 px).
- Barra de baixo flutuante a 26 px da borda, com efeito de vidro (`backdrop-filter: blur(20px) saturate(180%)`). Embaixo dela, um degradê para o conteúdo sumir suavemente.
- Áreas de toque de no mínimo 44 px.

## Elevação e profundidade

- Sombra padrão dos cartões: `0 1px 2px rgba(13,23,48,.04), 0 10px 28px rgba(13,23,48,.07)`. No escuro: `0 1px 2px rgba(0,0,0,.3), 0 10px 28px rgba(0,0,0,.35)`.
- Cartão de destaque: `0 16px 34px rgba(11,21,48,.28)`.
- Folha do lançamento rápido: flutua sobre um fundo escurecido e desfocado (`rgba(13,23,48,.38)` + `blur(6px)`).
- Ao tocar, botões e links encolhem para 97% de forma instantânea.

## Formas

- Cantos generosos: chip 22, cartão 26, destaque 28, folha 30, botão 32, barra 34.
- Ícones de traço de 1,6 a 2 px, cantos arredondados, sem preenchimento.
- Ícones de atalho dentro de círculos de 54 px.

## Componentes

- **Botão principal:** pílula marinho de 64 px com o texto à esquerda e uma seta num círculo branco à direita.
- **Botão secundário:** pílula branca com sombra, texto centralizado.
- **Botão de lançar:** círculo azul de 52 px dentro da barra de baixo.
- **Chip:** 44 px de altura. O selecionado fica marinho com texto branco.
- **Controle segmentado** (parcelamento, etapas): trilho cinza-claro com a opção ativa em branco e sombra leve.
- **Barra de progresso:** 5–6 px, arredondada. A cor muda pelo estado: azul normal, âmbar a partir de 85% e vermelho acima de 100%.
- **Aviso:** linha com fundo de atenção, ícone de sino num círculo branco, texto curto com número e seta.
- **Interruptor:** padrão iOS, verde `#34C759` quando ligado.
- **Modo discreto:** troca qualquer valor por "R$ ••••".

## A Capi (mascote)

- **Uma Capi por tela, no máximo.** Ela aparece nos momentos de relação: boas-vindas, onboarding, diagnóstico, lançamento salvo, metas, check-in, fechamento, placar e ajustes de privacidade.
- **Fica de fora das telas de número:** Fatura, Calendário, "Posso comprar?" e "E se…".
- **Capi do dia:** na Início, ao lado da saudação, uma figurinha muda a cada dia com uma frase. No app real, o Motor escolhe a figurinha pela situação (delivery alto → hambúrguer, meta andou → festa). O sorteio só serve quando não há nada a dizer.
- **Poses e uso:**

| Pose | Arquivo | Onde usar |
| --- | --- | --- |
| Acenando com moeda | `capi-acena.png` | Boas-vindas |
| Caderno | `capi-caderno.png` | Onboarding, estado vazio |
| Lupa | `capi-lupa.png` | Diagnóstico, Revisar no fechamento |
| Joinha | `capi-joinha.png` | Lançamento salvo |
| Dormindo nas moedas | `capi-dorme.png` | Metas, reserva segura |
| Chá | `capi-cha.png` | Check-in de domingo |
| Festa | `capi-festa.png` | Placar, meta alcançada |
| Apontando | `capi-aponta.png` | Avisos (quando não houver outra Capi na tela) |
| Recomeço | `capi-recomeco.png` | Mês estourado, sem culpa |
| Cofre | `capi-cofre.png` | Ajustes, backup |
| Figurinhas do dia | `dia-*.png` | Capi do dia na Início |

- **A Capi fala em primeira pessoa e com calma:** "Achei 3 linhas que não reconheci. Me ajuda?". Nunca dá bronca nem usa ponto de exclamação de alerta.
- Imagens com fundo transparente, exibidas com `height` fixo e largura automática. Não aplicar filtros nem trocar as cores da Capi.

## Pode e não pode

- Pode: um número grande por tela, em destaque.
- Pode: degradê só no marinho e no gelo.
- Não pode: verde-limão, dourado ou outras cores de destaque fora da paleta.
- Não pode: bordas em cartões. A separação é por sombra ou por fundo.
- Não pode: emoji na interface. Ícones são de traço.
- Não pode: duas Capis na mesma tela.
- Não pode: texto cinza-claro abaixo de 4,5:1.
- Não pode: estados (verde, âmbar, vermelho) como decoração.
