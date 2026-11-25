# Atalhos do iOS como ponte para o app

O app Atalhos recebe a Transação do Apple Pay (pagamento por aproximação, no crédito ou no débito). A URL de entrada abre o Safari no iPhone, onde o Capi usa um armazenamento separado do app instalado. A prova de Web Push verifica se tocar em uma notificação abre o Capi instalado a partir do iOS 16.4.

Após a confirmação no iPhone, a automação de Transação passará a enviar o valor e a Loja à ponte do ADR 0002. O push leva ao Capi instalado, que lê o Pendente e abre o Novo gasto para o Usuário confirmar a Categoria. As automações de horário continuam usando notificações locais.

Os Atalhos existentes podem continuar usando a URL de entrada. Os parâmetros `valor`, `loja` e `origem` formam um contrato público e seguem compatíveis.
