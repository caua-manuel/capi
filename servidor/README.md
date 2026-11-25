# Ponte do Atalho do Apple Pay

A prova verifica se tocar em uma notificação de teste abre o Capi instalado no iPhone com iOS 16.4 ou posterior. O Worker aceita chamadas da origem do GitHub Pages do Capi e envia notificações pelo serviço da Apple.

## Privacidade

- O KV usa o hash SHA-256 do Código do aparelho como única chave da inscrição. O valor contém apenas o `endpoint` e as chaves `p256dh` e `auth` que o Web Push exige.
- IP, user-agent, data de acesso e Código do aparelho ficam fora do KV e dos logs do Worker. A observabilidade, os logs de invocação e os traces estão desligados no `wrangler.toml`.
- Nesta prova, a ponte recebe inscrições e pedidos de teste. A etapa de pagamentos depende da confirmação no iPhone. Nela, Pendentes não lidos expiram no KV em até 48 horas e os lidos são apagados na leitura.

## Publicação no plano grátis

Crie ou entre na conta Cloudflare no plano grátis e abra **Workers & Pages** para configurar o subdomínio `workers.dev`. Execute estes comandos com Node.js 24 na pasta `servidor/`. No navegador, clique em **Permitir** quando o Wrangler solicitar autorização.

```sh
npm ci
npx wrangler login --scopes account:read user:read workers:write workers_kv:write workers_routes:write workers_scripts:write
npx wrangler deploy
npm run configurar-vapid
```

O deploy provisiona o KV da inscrição automaticamente. O Wrangler pode escrever o ID do KV na cópia local de `wrangler.toml`. O script de VAPID entrega o par diretamente a `wrangler secret put VAPID` e imprime somente a chave pública. O par fica no cofre de secrets do Worker.

Nos **Settings → Secrets and variables → Actions → Variables** do repositório do Capi, configure `VITE_PONTE_APPLE_PAY_URL` com a URL `workers.dev` impressa pelo deploy e `VITE_VAPID_CHAVE_PUBLICA` com a chave pública impressa pelo script. Publique o app com o workflow **Verificações e GitHub Pages**, a partir da `main`.

Para trocar as chaves, rode `npm run configurar-vapid` novamente, atualize `VITE_VAPID_CHAVE_PUBLICA` no GitHub e publique o app. No Capi instalado, abra **Ajustes → Lançar pelo Apple Pay**, toque em **Ativar notificações** e siga a mensagem para refazer a inscrição.

## Verificações locais

Rode na raiz do repositório.

```sh
npm --prefix servidor run test
npm --prefix servidor run build
```
