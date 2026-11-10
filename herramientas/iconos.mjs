// Dibuja el ícono de Ideal (una moneda negra que se llena de oro) sin programas extra.
// Crea los de la web y el de la app de iPhone. El de Android está dibujado en android/app/src/main/res.
// Uso: node herramientas/iconos.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const mezcla = (a, b, t) => a.map((c, i) => c + (b[i] - c) * t);

const FONDO_ARRIBA = [0x24, 0x24, 0x2a], FONDO_ABAJO = [0x05, 0x05, 0x07];
const ARO = [0x4a, 0x4a, 0x52], VACIO = [0x00, 0x00, 0x00];
const ORO_ARRIBA = [0xff, 0xdc, 0x4d], ORO_ABAJO = [0xf0, 0xa2, 0x00];
const R = 0.315, GROSOR = 0.014, NIVEL = 0.455;

// Color de un punto del ícono (x, y de 0 a 1).
function punto(x, y) {
  let c = mezcla(FONDO_ARRIBA, FONDO_ABAJO, y);
  const d = Math.hypot(x - 0.5, y - 0.5);
  if (d > R + GROSOR) return c;
  if (d > R) return ARO;
  const ola = NIVEL + 0.016 * Math.sin((x - 0.5) * Math.PI * 5.2);
  c = y > ola ? mezcla(ORO_ARRIBA, ORO_ABAJO, (y - ola) / (0.5 + R - ola)) : VACIO;
  // Brillo de vidrio arriba a la izquierda.
  const b = Math.max(0, 1 - Math.hypot(x - 0.37, y - 0.3) / 0.3) ** 2 * 0.16;
  return mezcla(c, [255, 255, 255], b);
}

function dibujar(tam) {
  const px = Buffer.alloc(tam * tam * 4), S = 4;
  for (let j = 0; j < tam; j++) for (let i = 0; i < tam; i++) {
    const a = [0, 0, 0];
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const c = punto((i + (sx + 0.5) / S) / tam, (j + (sy + 0.5) / S) / tam);
      a[0] += c[0]; a[1] += c[1]; a[2] += c[2];
    }
    const o = (j * tam + i) * 4;
    px[o] = Math.round(a[0] / (S * S)); px[o + 1] = Math.round(a[1] / (S * S)); px[o + 2] = Math.round(a[2] / (S * S)); px[o + 3] = 255;
  }
  return png(tam, px);
}

const TABLA = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLA[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function trozo(tipo, datos) {
  const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length);
  const td = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([largo, td, c]);
}
// PNG sin transparencia (RGB), como lo pide el ícono del iPhone.
function png(tam, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tam, 0); ihdr.writeUInt32BE(tam, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  const filas = Buffer.alloc((tam * 3 + 1) * tam);
  for (let j = 0; j < tam; j++) for (let i = 0; i < tam; i++) {
    const o = j * (tam * 3 + 1) + 1 + i * 3, p = (j * tam + i) * 4;
    filas[o] = rgba[p]; filas[o + 1] = rgba[p + 1]; filas[o + 2] = rgba[p + 2];
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr), trozo('IDAT', deflateSync(filas, { level: 9 })), trozo('IEND', Buffer.alloc(0))
  ]);
}

for (const t of [180, 192, 512]) {
  writeFileSync(join(raiz, 'web', `icon-${t}.png`), dibujar(t));
  console.log(`web/icon-${t}.png listo`);
}
const carpetaIOS = join(raiz, 'ios', 'Ideal', 'Assets.xcassets', 'AppIcon.appiconset');
mkdirSync(carpetaIOS, { recursive: true });
writeFileSync(join(carpetaIOS, 'icono-1024.png'), dibujar(1024));
console.log('ios: icono-1024.png listo');

writeFileSync(join(raiz, 'web', 'icon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24242a"/><stop offset="1" stop-color="#050507"/></linearGradient>
    <linearGradient id="o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffdc4d"/><stop offset="1" stop-color="#f0a200"/></linearGradient>
    <clipPath id="m"><circle cx="50" cy="50" r="31.5"/></clipPath>
  </defs>
  <rect width="100" height="100" rx="22" fill="url(#f)"/>
  <circle cx="50" cy="50" r="32.2" fill="#000" stroke="#4a4a52" stroke-width="1.4"/>
  <path clip-path="url(#m)" d="M15 45.5 q4.8 -3.2 9.6 0 t9.6 0 t9.6 0 t9.6 0 t9.6 0 t9.6 0 t9.6 0 t9.6 0 V85 H15 Z" fill="url(#o)"/>
</svg>
`);
console.log('web/icon.svg listo');
