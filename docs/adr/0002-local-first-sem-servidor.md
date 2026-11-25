# Dados só no aparelho, sem servidor

Todos os dados ficam no banco do navegador (IndexedDB) do aparelho. O app é um PWA estático, hospedado no GitHub Pages com a stack React + TypeScript + Vite, a mesma do Fitnez. A segurança vem de nada sair do celular. O custo é zero e não há login nem servidor para manter. A proteção contra perda é um backup manual em arquivo.

## Consequências
- Não haverá push: push exige servidor. Os Avisos aparecem quando o app é aberto. Lembretes com o app fechado só vêm por automações do app Atalhos do iOS, que mandam uma notificação local sem servidor (ver ADR 0003).
- Open Finance (Pluggy e similares) exige uma chave secreta guardada num servidor, então fica fora do MVP.
- O motor financeiro é um módulo puro, separado da tela, e pode ser testado sem navegador.
- **No iOS, os dados vivem em um único contexto de armazenamento.** O Safari e o app instalado na Tela de Início guardam o IndexedDB em lugares separados, e um não enxerga o outro. Quem começa no navegador e instala depois recomeça do zero. Por isso, no Safari do iPhone (fora da Tela de Início), a primeira tela é "Instale a Capi primeiro", antes do Onboarding. A pessoa pode seguir no navegador mesmo assim, depois de uma confirmação que repete o aviso; se já houver dados, a tela oferece Exportar backup antes, e o app instalado traz "Importar backup" na primeira tela para recuperá-los. A tela não aparece em computador, no Android nem em outros navegadores, e some quando o app é aberto pelo ícone.
