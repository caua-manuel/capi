# Ponte do Atalho do Apple Pay

O Atalhos envia um pagamento com `POST /pagamento` e `Authorization: Bearer <código>`. O Worker guarda o Pendente e responde antes do envio pelo Web Push da Apple. O Capi instalado busca a fila em `GET /pendentes` e pode apagar a inscrição e a fila com `POST /desligar`. As rotas do app aceitam somente a origem do GitHub Pages do Capi. O POST nativo do Atalhos também funciona sem o cabeçalho `Origin`.

## Privacidade

- O KV usa o hash SHA-256 do Código do aparelho como única chave da inscrição. O valor contém apenas o `endpoint` e as chaves `p256dh` e `auth` que o Web Push exige.
- IP, user-agent, data de acesso e Código do aparelho ficam fora do KV e dos logs do Worker. A observabilidade, os logs de invocação e os traces estão desligados no `wrangler.toml`.
- Pendentes guardam apenas valor em centavos e Loja. A chave no KV combina o hash do código e um identificador aleatório. Cada registro expira em 48 horas. Uma leitura retira os registros da fila uma única vez e apaga as respectivas chaves. Se o KV falhar na exclusão, um alarme repete a limpeza e o TTL continua valendo.
- Um Durable Object por hash serializa leituras e exclusões. Seu estado temporário contém as referências da fila, um contador por hora e uma marca de revogação por até 48 horas para bloquear dados antigos em cache. A marca é mantida se a exclusão da inscrição precisar de nova tentativa. O limite é de 60 chamadas por hora e 200 Pendentes por código. Desligar continua disponível quando o código atinge o limite.
- A borda limita cada rota a aproximadamente 120 chamadas por minuto por região, usando apenas o nome da rota como chave.
- Cabeçalho, código, IP, user-agent e dados de pagamento ficam fora dos logs. O valor e a Loja aparecem na notificação recebida no iPhone.

## Publicação no plano grátis

Crie ou entre na conta Cloudflare no plano grátis e abra **Workers & Pages** para configurar o subdomínio `workers.dev`. Execute estes comandos com Node.js 24 na pasta `servidor/`. No navegador, clique em **Permitir** quando o Wrangler solicitar autorização.

```sh
npm ci
npx wrangler login --scopes account:read user:read workers:write workers_kv:write workers_routes:write workers_scripts:write
npx wrangler deploy
npm run configurar-vapid
```

O deploy provisiona os namespaces KV e o Durable Object SQLite no plano grátis. O Wrangler pode escrever os IDs do KV na cópia local de `wrangler.toml`. Em atualização de um Worker existente, `npx wrangler deploy` preserva o secret VAPID. Na primeira publicação, `npm run configurar-vapid` entrega o par diretamente a `wrangler secret put VAPID` e imprime somente a chave pública. O par fica no cofre de secrets do Worker.

Nos **Settings → Secrets and variables → Actions → Variables** do repositório do Capi, configure `VITE_PONTE_APPLE_PAY_URL` com a URL `workers.dev` impressa pelo deploy e `VITE_VAPID_CHAVE_PUBLICA` com a chave pública impressa pelo script. Publique o app com o workflow **Verificações e GitHub Pages**, a partir da `main`.

Para trocar as chaves, rode `npm run configurar-vapid` novamente, atualize `VITE_VAPID_CHAVE_PUBLICA` no GitHub e publique o app. No Capi instalado, abra **Ajustes → Lançar pelo Apple Pay**, toque em **Ativar notificações** e siga a mensagem para refazer a inscrição.

## Verificações locais

Rode na raiz do repositório.

```sh
npm --prefix servidor run test
npm --prefix servidor run build
```
