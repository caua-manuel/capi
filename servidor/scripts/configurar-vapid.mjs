import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const par = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const { x, y, d } = par.privateKey.export({ format: 'jwk' });
const publicKey = Buffer.concat([Buffer.from([4]), Buffer.from(x, 'base64url'), Buffer.from(y, 'base64url')]).toString('base64url');

const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
const envio = spawnSync(process.execPath, [wrangler, 'secret', 'put', 'VAPID'], {
  input: JSON.stringify({ publicKey, privateKey: d }),
  stdio: ['pipe', 'inherit', 'inherit'],
  cwd: fileURLToPath(new URL('../', import.meta.url)),
});

if (envio.status !== 0) {
  process.stderr.write('O Wrangler não conseguiu gravar o secret VAPID.\n');
  process.exit(envio.status ?? 1);
}

process.stdout.write(`VITE_VAPID_CHAVE_PUBLICA=${publicKey}\n`);
