// Gera os ícones do PWA a partir de design/capi/capi-icone-original.png.
// Corta 80 px de cada lado para tirar as bordas arredondadas (o iOS arredonda sozinho).
import sharp from 'sharp';

const origem = 'design/capi/capi-icone-original.png';
const meta = await sharp(origem).metadata();
const corte = 80;
const lado = Math.min(meta.width, meta.height) - corte * 2;
const base = sharp(origem).extract({ left: corte, top: corte, width: lado, height: lado }).flatten({ background: '#0B1530' });
const buffer = await base.png().toBuffer();

const tamanhos = { 'apple-touch-icon.png': 180, 'icone-167.png': 167, 'icone-152.png': 152, 'icone-120.png': 120, 'icone-192.png': 192, 'icone-512.png': 512, 'favicon-32.png': 32 };
for (const [nome, tamanho] of Object.entries(tamanhos)) {
  await sharp(buffer).resize(tamanho, tamanho).png().toFile(`public/${nome}`);
  console.log(nome, tamanho);
}

// Cópias leves da Capi para o app (altura de 480 px basta para telas retina).
import { readdirSync, mkdirSync } from 'node:fs';
mkdirSync('public/capi', { recursive: true });
for (const arquivo of readdirSync('design/capi').filter((a) => a.endsWith('.png') && !a.startsWith('capi-icone'))) {
  await sharp(`design/capi/${arquivo}`).resize({ height: 480, withoutEnlargement: true }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(`public/capi/${arquivo}`);
}
console.log('Capi copiada para public/capi');
