# Dados financeiros locais e ponte para o Atalho do Apple Pay

O Plano e o histórico financeiro ficam no banco do navegador (IndexedDB) do aparelho. O app é um PWA estático, hospedado no GitHub Pages com React, TypeScript e Vite. A proteção contra perda é um backup manual em arquivo. O app funciona sem login.

O Atalho do Apple Pay tem uma ponte opcional em Cloudflare Workers e KV no plano grátis. A prova usa apenas Web Push de teste. O KV guarda o endereço e as duas chaves exigidas pelo Web Push em uma única inscrição, cuja chave é o hash SHA-256 do Código do aparelho. O Worker opera com a observabilidade desativada e sem registros de IP, user-agent ou data de acesso no KV ou em logs.

Com a prova confirmada, a ponte poderá receber o valor e a Loja de cada pagamento como um Pendente. A leitura apaga o Pendente e o KV expira Pendentes não lidos em até 48 horas. O Plano, os saldos, as Metas, as Categorias e o histórico permanecem no aparelho.

## Consequências
- Os Avisos aparecem quando o app é aberto. Os Lembretes de horário usam as automações locais do Atalhos do iOS. O Web Push fica restrito à ponte do Atalho do Apple Pay (ver ADR 0003).
- Open Finance (Pluggy e similares) exige uma chave secreta guardada num servidor, então fica fora do MVP.
- O motor financeiro é um módulo puro, separado da tela, e pode ser testado sem navegador.
- **No iOS, os dados vivem em um único contexto de armazenamento.** O Safari e o app instalado na Tela de Início guardam o IndexedDB em lugares separados, e um não enxerga o outro. Quem começa no navegador e instala depois recomeça do zero. Por isso, no Safari do iPhone (fora da Tela de Início), a primeira tela é "Instale a Capi primeiro", antes do Onboarding. A pessoa pode seguir no navegador mesmo assim, depois de uma confirmação que repete o aviso; se já houver dados, a tela oferece Exportar backup antes, e o app instalado traz "Importar backup" na primeira tela para recuperá-los. A tela não aparece em computador, no Android nem em outros navegadores, e some quando o app é aberto pelo ícone.
