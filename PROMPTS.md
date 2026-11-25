# Prompts do Capi (Claude Code no VS Code)

Abra a pasta C:\Capri no VS Code. Cada fase começa numa conversa nova. Troque o modelo antes de colar o prompt.

---

## Fase A — modelo Sonnet (setup + issues 01, 02, 03, 04, 19)

```
Oi! Este é o projeto Capi, um PWA de finanças pessoais. Não precisa me explicar os passos: faça o trabalho e, ao terminar cada issue, me entregue o relatório (o que mudou, o que testar, detalhes), como diz o CLAUDE.md. Esta sessão é SONNET: trabalhe só em issues com o rótulo modelo:sonnet.

ENTENDER (sem código ainda)
1. Leia, nesta ordem: CLAUDE.md (inclusive "Fases e modelos"), GLOSSARY.md, docs/adr/, DESIGN.md, docs/motor-financeiro.md, .scratch/mvp/spec.md e .scratch/mvp/issues/.
2. Siga direto para o GitHub, sem me mandar resumo.

GITHUB (peça minha confirmação uma vez só, antes de criar o repositório e publicar as issues)
3. Confira git, gh e meu login (gh auth status). Só se faltar algo, me diga o comando e espere.
4. Crie um .gitignore para Node/Vite (node_modules, dist, .env) e inicie o git na branch main.
5. Crie o repositório PRIVADO "capi" no meu GitHub, faça o primeiro commit ("Adiciona documentação inicial do Capi") e o push.
6. Mostre o repositório que o script vai usar e rode: bash scripts/publicar-issues.sh. Mostre a lista "NN -> #numero".
7. Confira no GitHub as 22 issues, a spec e os rótulos modelo:sonnet/modelo:opus. Só então apague .scratch/ e faça um commit ("Move issues para o GitHub").
8. Rode /setup-matt-pocock-skills só para CONFERIR docs/agents/. Não sobrescreva nada sem me perguntar.

TRABALHAR AS ISSUES DA FASE A (01 → 02 → 03 → 04 → 19)
Para cada issue, na ordem:
a. Atribua a mim, coloque o rótulo em-andamento e crie a branch NN-slug.
b. Implemente seguindo o CLAUDE.md e o DESIGN.md (tema claro e escuro desde o início). Na 01: React + TypeScript strict + Vite, Vitest, vite-plugin-pwa, IndexedDB (idb), as pastas da spec, o ícone de design/capi/capi-icone-original.png nos tamanhos do iPhone e deploy no GitHub Pages por GitHub Actions. Na 02: use /tdd no Leitor de lançamento.
c. Rode npm run test e npm run build.
d. Abra o PR com "Fecha #n", marque os critérios de aceite e me entregue o relatório: o que mudou, o que testar (passo a passo, com o resultado esperado) e detalhes. Siga para a próxima issue da fase; se ela depender da anterior ainda sem merge, crie a branch nova a partir da branch anterior. O merge só quando eu pedir.
Ao terminar a 19, pare e me diga: "Fase A concluída. Troque para o Opus e use o prompt da Fase B."

REGRAS
- Termos do GLOSSARY.md no código (Lancamento, Teto, Meta…), sem acento.
- Nunca coloque dados reais de fatura no repositório.
- Se algo contradisser um ADR, me avise antes.
- Conversa longa: rode /handoff e me peça para abrir uma sessão nova.
- Erro: use /diagnosing-bugs antes de mexer no código.
```

---

## Fase B — modelo Opus (o Motor: 05, 07, 08, 09, 11, 12, 14, 16, 17 e 10)

```
Esta sessão é OPUS. Leia o CLAUDE.md (inclusive "Fases e modelos"), GLOSSARY.md, DESIGN.md, docs/adr/ e docs/motor-financeiro.md. Não explique os passos: faça e, ao terminar cada issue, me entregue o relatório (o que mudou, o que testar, detalhes).

Trabalhe só issues com o rótulo modelo:opus, na ordem: 05 → 06 → 07 → 08 → 09 → 12 → 11 → 14 → 17 → 16. Exceção: faça também a 06 (Fixos, modelo:sonnet) logo depois da 05, porque a 07 e a 11 dependem dela. Crie a tabela de Parâmetros dentro do Motor desde a 05 (a tela de Ajustes da 21 fica para a Fase C). A 10 (importador do PicPay) só quando eu colar o texto real da fatura; pule-a até lá.

Para cada issue:
a. Atribua a mim, rótulo em-andamento, branch NN-slug.
b. O Motor é puro: use /tdd, com testes de pessoas fictícias, seguindo exatamente as fórmulas do motor-financeiro.md. Dinheiro em centavos. Parâmetros (Selic, IOF, rendimento) sempre da tabela de Parâmetros.
c. Faça a tela mínima que o critério de aceite pede, seguindo o DESIGN.md. Telas mais elaboradas ficam para a Fase C.
d. npm run test, npm run build, PR com "Fecha #n" e o relatório (o que mudou, o que testar, detalhes). Siga para a próxima (se depender de uma branch ainda sem merge, parta dela); merge só quando eu pedir.

Se uma issue depender de algo da Fase C, me avise e siga para a próxima. Ao terminar, pare e diga: "Fase B concluída. Troque para o Sonnet e use o prompt da Fase C."
```

---

## Fase C — modelo Sonnet (06, 13, 15, 18, 20, 21, 22)

```
Esta sessão é SONNET. Leia o CLAUDE.md (inclusive "Fases e modelos"), GLOSSARY.md, DESIGN.md e as telas de referência em design/telas/. Não explique os passos: faça e, ao terminar cada issue, me entregue o relatório (o que mudou, o que testar, detalhes).

Trabalhe só issues com o rótulo modelo:sonnet que estejam livres, nesta ordem: 21 → 06 → 15 → 13 → 18 → 20 → 22.

Para cada issue:
a. Atribua a mim, rótulo em-andamento, branch NN-slug.
b. Use o Motor que já existe (não reescreva contas). Siga o DESIGN.md e as telas de design/telas/. A Capi aparece no máximo uma vez por tela, com as imagens de design/capi/.
c. Depois de cada tela, rode a skill break-ui com valores extremos (R$ 1.000.000, zero gastos, nome de loja enorme) e corrija o que quebrar.
d. npm run test, npm run build, PR com "Fecha #n" e o relatório (o que mudou, o que testar, detalhes). Siga para a próxima (se depender de uma branch ainda sem merge, parta dela); merge só quando eu pedir.

Ao terminar, faça uma revisão final com /impeccable polish nas telas e me mostre o que falta para o MVP estar completo.
```

---

## Retomar qualquer fase depois de uma pausa

```
Leia o CLAUDE.md e o último handoff, se houver. Esta sessão é [SONNET/OPUS]. Pegue a próxima issue livre com o rótulo modelo:[sonnet/opus] e siga o fluxo: branch, plano para eu aprovar, testes, build e PR com "Fecha #n".
```
