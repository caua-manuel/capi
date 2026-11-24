# Capi: finanças de bolso

O app se chama **Capi**, e a mascote é a Capi, uma capivara. PWA individual, minimalista e genérico de finanças pessoais para o Brasil. A pessoa responde um onboarding e recebe um Plano mensal com Tetos, Metas com data, dicas e avisos. Os gastos entram por lançamento rápido, pelo Atalho do Apple Pay e pelo texto colado da Fatura. Não tem servidor nem login, e os dados ficam só no aparelho.

## Ler antes de qualquer tarefa, nesta ordem

1. `GLOSSARY.md`: o vocabulário oficial. Use os termos exatamente como estão lá.
2. `docs/adr/`: decisões que não se rediscutem sem motivo forte.
3. `docs/motor-financeiro.md`: todas as regras e fórmulas financeiras. É a fonte da verdade para cálculos.
4. `DESIGN.md`: cores, fontes, componentes e regras da mascote. Toda tela segue este arquivo; as referências visuais estão em `design/telas/`.
5. A issue da especificação do MVP no GitHub (título "Especificação: MVP…"): o que o MVP faz e como está dividido em módulos.
6. A issue em que você vai trabalhar (`gh issue view <n>`).

## Regras fixas

- **Sem servidor, sem login, sem push** (ADR 0002). Nada de backend, API própria ou Open Finance no MVP.
- **Só um Usuário por aparelho** (ADR 0001).
- **A URL de entrada é um contrato** (ADR 0003). Não mude os parâmetros `valor`, `loja` e `origem` sem manter compatibilidade.
- **O Motor é puro.** Toda conta financeira fica no Motor, sem tela e sem ler nem gravar dados. As Telas só mostram o que o Motor devolve.
- **Parâmetros nunca vão direto no código.** Selic, CDI, IOF, IR e salário mínimo vêm da tabela de Parâmetros.
- **Privacidade:** nunca pedir senha de banco nem número completo de cartão. O texto colado da Fatura é descartado depois da Importação. Nunca colocar dados reais de fatura no repositório; nos testes, só versões anonimizadas.
- **Design:** use só as cores e os componentes do `DESIGN.md`, com tema claro e escuro desde o início. Uma Capi por tela, no máximo, e nunca nas telas de número. Nada de emoji na interface.
- **Aviso educativo:** o plano é educativo e não é recomendação de investimento. Falar de tipos de produto, nunca de um banco ou ativo específico.

## Padrões

### Idioma
- Tudo em **português do Brasil**: documentos, issues, textos da interface, mensagens de commit, comentários e nomes de teste.
- **Nomes do domínio no código** seguem o `GLOSSARY.md`, em português e sem acento: `Lancamento`, `Teto`, `Meta`, `Fatura`, `Conciliacao`, `PrevisaoDeFatura`, `MesDoPlano`.
- Palavras que são do React, do TypeScript ou do navegador continuam em inglês: `useState`, `props`, `IndexedDB`, `fetch`.

### Código
- React + TypeScript (modo `strict`) + Vite. Testes com Vitest.
- Pastas por módulo da spec: `motor/`, `leitor/`, `importador/`, `conciliacao/`, `repositorio/`, `telas/`.
- Imagens da Capi vêm de `design/capi/`; copie para `public/capi/` quando montar o app.
- Dinheiro sempre em **centavos inteiros** (`number`), nunca em ponto flutuante. Formatar como R$ só na Tela.
- Datas no formato `AAAA-MM-DD`. Cada Lançamento guarda a data da compra; a data de pagamento vem do ciclo da Fatura.

### Testes
- Use `/tdd` no Motor, no Leitor, no Importador e na Conciliação.
- Teste só o resultado ("dadas estas entradas, sai este Plano"), nunca como a conta é feita por dentro.
- Nomes de teste em português, com os termos do glossário: `"Teto de Delivery cai quando a Sobra é negativa"`.

### Commits
- Mensagem em português, no imperativo, citando a issue: `Adiciona Conciliação por valor e data (#12)`.
- Uma branch por issue (`12-conciliacao`) e um PR com `Fecha #12`, para o histórico ficar ligado à issue.
- Um commit por passo verde do `/tdd` é bem-vindo.

## Como trabalhar uma issue

1. Escolha a próxima issue da fronteira (ver `docs/agents/issue-tracker.md`).
2. Atribua a issue a você e coloque o rótulo `em-andamento`; crie a branch dela.
3. Implemente uma fatia vertical completa, sem pausas para aprovação, (Motor, Repositório e Tela, quando couber) e marque os critérios de aceite.
4. Rode `npm run test` e `npm run build`, e confira a tela no celular ou no simulador.
5. Abra o PR com `Fecha #<n>`, cole o relatório (o que mudou, o que testar, detalhes) na descrição e me mostre o mesmo relatório. O merge só acontece quando eu pedir.

## Fases e modelos

As issues têm o rótulo `modelo:sonnet` ou `modelo:opus` e são feitas em três fases:

- **Fase A (Sonnet):** 01, 02, 03, 04 e 19. Esqueleto, lançamento, Atalho, categorias e modo discreto.
- **Fase B (Opus):** 05, 07, 08, 09, 11, 12, 14, 16 e 17, mais a 10 depois de 5/12. É o Motor: diagnóstico, plano, metas, dívidas, conciliação, recorrentes, previsão, "Posso comprar?" e avisos.
- **Fase C (Sonnet):** 06, 13, 15, 18, 20, 21 e 22. Telas e cadastros em cima do Motor pronto.

Trabalhe só nas issues do modelo da sessão. Se uma issue do seu modelo estiver bloqueada por outra do outro modelo, pule e avise o dono. Nunca puxe uma issue `modelo:opus` numa sessão Sonnet.

## Sobre o dono

Desenvolvedor iniciante e designer. Não explique cada passo nem peça aprovação de plano: faça o trabalho inteiro da issue e, no fim, entregue um relatório curto com três partes:
1. **O que mudou:** arquivos e funcionalidades, em linguagem simples.
2. **O que testar:** passos concretos no celular ou no navegador, com o resultado esperado de cada um.
3. **Detalhes:** decisões tomadas, limitações e o que ficou para depois.

Pergunte antes só quando houver uma escolha que muda o produto ou contradiz um ADR.

## Skills

- Antes de programar: `/grill-with-docs`, `/prototype`.
- Programando: `/tdd`, `/diagnosing-bugs`.
- Para aprender: `/teach`, `/wait-what`.
- Telas: impeccable (`shape`, `critique`, `polish`, `document` para o DESIGN.md), `apple-design`, `gestures` e `break-ui`.
- Sessão longa: `/handoff`.

## Agent skills

### Issue tracker

GitHub Issues, via `gh`. Ver `docs/agents/issue-tracker.md`.

### Triage labels

Os cinco rótulos padrão (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), mais `em-andamento`; issue terminada é fechada. Ver `docs/agents/triage-labels.md`.

### Domain docs

Contexto único: `GLOSSARY.md` e `docs/adr/` na raiz. Ver `docs/agents/domain.md`.
