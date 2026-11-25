import { Buffer } from 'node:buffer';
import { createDecipheriv, createPrivateKey, createPublicKey, diffieHellman, hkdfSync } from 'node:crypto';

// Valores públicos do vetor da seção 5 e do apêndice A da RFC 8291.
const publicoDoServidor = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
export const CHAVES_DE_TESTE = {
  publicKey: publicoDoServidor,
  privateKey: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
};
export const ORIGEM = 'https://caua-manuel.github.io';
export const INSCRICAO_DE_TESTE = {
  endpoint: 'https://web.push.apple.com/teste',
  keys: {
    p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
    auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  },
};

export function decifrarPeloNavegadorDeTeste(corpo: Buffer): string {
  const salt = corpo.subarray(0, 16);
  const publicaDoNavegador = Buffer.from(INSCRICAO_DE_TESTE.keys.p256dh, 'base64url');
  const publicaDoPush = corpo.subarray(21, 21 + corpo[20]);
  const cifrado = corpo.subarray(21 + corpo[20]);
  const jwk = (chave: Buffer) => ({
    kty: 'EC', crv: 'P-256', x: chave.subarray(1, 33).toString('base64url'), y: chave.subarray(33).toString('base64url'),
  });
  const segredo = diffieHellman({
    privateKey: createPrivateKey({ key: { ...jwk(publicaDoNavegador), d: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94' }, format: 'jwk' }),
    publicKey: createPublicKey({ key: jwk(publicaDoPush), format: 'jwk' }),
  });
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), publicaDoNavegador, publicaDoPush]);
  const material = Buffer.from(hkdfSync('sha256', segredo, Buffer.from(INSCRICAO_DE_TESTE.keys.auth, 'base64url'), info, 32));
  const chave = Buffer.from(hkdfSync('sha256', material, salt, 'Content-Encoding: aes128gcm\0', 16));
  const nonce = Buffer.from(hkdfSync('sha256', material, salt, 'Content-Encoding: nonce\0', 12));
  const decifrar = createDecipheriv('aes-128-gcm', chave, nonce).setAuthTag(cifrado.subarray(-16));
  const aberto = Buffer.concat([decifrar.update(cifrado.subarray(0, -16)), decifrar.final()]);
  return aberto.subarray(0, aberto.lastIndexOf(2)).toString('utf8');
}
