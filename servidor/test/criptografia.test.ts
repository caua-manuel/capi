import { Buffer } from 'node:buffer';
import { encryptNotification } from '@block65/webcrypto-web-push';
import { afterEach, expect, it, vi } from 'vitest';
import { CHAVES_DE_TESTE, INSCRICAO_DE_TESTE } from './rfc8291';

afterEach(() => vi.restoreAllMocks());

it('reproduz o corpo aes128gcm da RFC 8291 byte por byte', async () => {
  const chave = Buffer.from(CHAVES_DE_TESTE.publicKey, 'base64url');
  const algoritmo = { name: 'ECDH', namedCurve: 'P-256' };
  const publicKey = await crypto.subtle.importKey('raw', chave, algoritmo, true, []);
  const privateKey = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', d: CHAVES_DE_TESTE.privateKey,
    x: chave.subarray(1, 33).toString('base64url'), y: chave.subarray(33).toString('base64url'),
  }, algoritmo, false, ['deriveBits']);
  // O vetor publica a chave efêmera e o salt. Em produção ambos vêm do gerador criptográfico.
  const salt = Buffer.from('DGv6ra1nlYgDCS1FRnbzlw', 'base64url');
  vi.spyOn(crypto.subtle, 'generateKey').mockResolvedValueOnce({ publicKey, privateKey });
  vi.spyOn(crypto, 'getRandomValues').mockReturnValueOnce(salt);

  const dados = Buffer.from('V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24', 'base64url');
  const corpo = await encryptNotification({ ...INSCRICAO_DE_TESTE, expirationTime: null }, dados, { pad: false });
  const cabecalho = 'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
  const criptograma = '8pfeW0KbunFT06SuDKoJH9Ql87S1QUrdirN6GcG7sFz1y1sqLgVi1VhjVkHsUoEsbI_0LpXMuGvnzQ';
  expect(Buffer.from(corpo)).toEqual(Buffer.concat([Buffer.from(cabecalho, 'base64url'), Buffer.from(criptograma, 'base64url')]));
});
