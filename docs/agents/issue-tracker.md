# Rastreador de issues: GitHub

As issues e a especificação deste repositório ficam no GitHub Issues. Use o `gh` para tudo.

## Convenções

- **Criar:** `gh issue create --title "..." --body "..."` (use heredoc para corpo com várias linhas). Título em português, começando pelo número da fatia quando houver: `22: ...`.
- **Ler:** `gh issue view <n> --json number,title,body,labels,comments`.
- **Listar:** `gh issue list --state open --label ready-for-agent`.
- **Parte da spec:** toda issue de implementação começa com `Parte de #<n da spec>` e, quando possível, é sub-issue da spec.
- **Bloqueio:** use as dependências nativas do GitHub (`gh issue edit <filha> --add-blocked-by <bloqueadora>`, no gh 2.94+). Em versões antigas, use `gh api --method POST repos/<dono>/<repo>/issues/<filha>/dependencies/blocked_by -F issue_id=<id da bloqueadora>` (o `id` numérico de `gh api repos/<dono>/<repo>/issues/<n> --jq .id`, não o número). O corpo da issue também lista os bloqueios em `## Bloqueado por`.
- **Pode começar?** `gh api repos/<dono>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by` (0 = livre).
- **Comentar:** `gh issue comment <n> --body "..."`.
- **Rótulos:** `gh issue edit <n> --add-label "..."` / `--remove-label "..."`.
- **Fechar:** comente o que foi feito e o que ficou de fora, e depois rode `gh issue close <n>`.
- **Commits e PRs** citam a issue: `Adiciona Conciliação por valor e data (#12)`. Use `Fecha #12` no PR que termina a issue.

Publique issues só no repositório do dono. Antes da primeira criação na sessão, confira com `gh repo view --json nameWithOwner`.

## Pull requests como pedidos

**PRs como pedidos: não.**

## Quando uma skill disser "publicar no rastreador de issues"

Criar uma issue no GitHub.

## Quando uma skill disser "buscar a issue"

Ler a issue como em **Ler** acima.

## Fronteira de trabalho

A próxima issue é a aberta de menor número com o rótulo `ready-for-agent` E o rótulo do modelo da sessão (`modelo:sonnet` ou `modelo:opus`), sem bloqueios abertos e sem ninguém atribuído. Listar: `gh issue list --state open --label ready-for-agent --label modelo:sonnet`. Ao começar: `gh issue edit <n> --add-assignee @me --add-label em-andamento`.

## Publicação inicial

As issues do MVP foram escritas em `.scratch/mvp/` e são publicadas uma vez com `scripts/publicar-issues.sh`. Depois disso, o GitHub é a fonte da verdade e a pasta `.scratch/` pode ser apagada.
