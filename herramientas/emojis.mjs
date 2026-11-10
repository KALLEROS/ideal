// Arma la galería de emojis de la app (web/emojis.js) con sus nombres en español para poder buscarlos.
// Solo baja dos archivos de texto de Unicode, el organismo que define los emojis:
//   - la lista oficial de emojis (unicode.org)
//   - sus nombres y palabras clave en español (github.com/unicode-org/cldr-json)
// Los emojis no se descargan como imágenes: los dibuja el propio teléfono.
// Uso: node herramientas/emojis.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const LISTA = 'https://unicode.org/Public/emoji/15.1/emoji-test.txt';
const NOMBRES = (idioma) => `https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-annotations-full/annotations/${idioma}/annotations.json`;
const DERIVADOS = (idioma) => `https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-annotations-derived-full/annotationsDerived/${idioma}/annotations.json`;

// Emojis más nuevos que esta versión pueden verse como un cuadro vacío en teléfonos no actualizados.
const VERSION_MAXIMA = 15.0;

const GRUPOS = {
  'Smileys & Emotion': 'Caras',
  'People & Body': 'Personas',
  'Animals & Nature': 'Animales y naturaleza',
  'Food & Drink': 'Comida y bebida',
  'Travel & Places': 'Lugares y viajes',
  'Activities': 'Actividades',
  'Objects': 'Objetos',
  'Symbols': 'Símbolos',
  'Flags': 'Banderas'
};

async function bajar(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`No se pudo bajar ${url}: ${r.status}`);
  return r.text();
}
async function nombresDe(idioma) {
  const salida = {};
  for (const [hacer, clave] of [[NOMBRES, 'annotations'], [DERIVADOS, 'annotationsDerived']]) {
    const json = JSON.parse(await bajar(hacer(idioma)));
    Object.assign(salida, json[clave].annotations);
  }
  return salida;
}
const sinVariante = (s) => s.replace(/️/g, '');
const tieneTono = (s) => /[\u{1F3FB}-\u{1F3FF}]/u.test(s);

const [lista, es, es419, esMX] = await Promise.all([bajar(LISTA), nombresDe('es'), nombresDe('es-419'), nombresDe('es-MX')]);
// El nombre sale del español más cercano (México, luego Latinoamérica, luego general);
// las palabras para buscar se juntan de los tres.
const buscarNombre = (emoji) => {
  const k = sinVariante(emoji);
  let nombre = null;
  const palabras = new Set();
  for (const fuente of [esMX, es419, es]) {
    const a = fuente[emoji] || fuente[k];
    if (!a) continue;
    if (!nombre && a.tts) nombre = a.tts[0];
    for (const p of a.default || []) palabras.add(p);
    if (a.tts) palabras.add(a.tts[0]);
  }
  if (!nombre) return null;
  palabras.delete(nombre);
  return { nombre, palabras: [...palabras] };
};

const grupos = [];
let actual = null, sinNombre = 0;
for (const linea of lista.split('\n')) {
  const g = linea.match(/^# group: (.+)$/);
  if (g) {
    const nombre = GRUPOS[g[1].trim()];
    actual = nombre ? { n: nombre, e: [] } : null; // "Component" (tonos de piel sueltos) no se usa
    if (actual) grupos.push(actual);
    continue;
  }
  if (!actual) continue;
  const m = linea.match(/^[0-9A-F ]+;\s*fully-qualified\s*#\s*(\S+)\s+E(\d+\.\d+)\s/);
  if (!m) continue;
  const emoji = m[1];
  if (parseFloat(m[2]) > VERSION_MAXIMA || tieneTono(emoji)) continue;
  const a = buscarNombre(emoji);
  if (!a) { sinNombre++; continue; }
  actual.e.push([emoji, a.nombre, a.palabras.join(' ')]);
}

const total = grupos.reduce((s, g) => s + g.e.length, 0);
const salida = `// Galería de emojis con nombres en español. Archivo generado por herramientas/emojis.mjs: no editar a mano.
// Fuente: Unicode (emoji-test.txt ${VERSION_MAXIMA.toFixed(1)} y nombres de CLDR). Cada emoji es [emoji, nombre, palabras para buscar].
window.IDEAL_EMOJIS = ${JSON.stringify(grupos)};
`;
writeFileSync(join(raiz, 'web', 'emojis.js'), salida);
console.log(`web/emojis.js listo: ${total} emojis en ${grupos.length} grupos (${Math.round(salida.length / 1024)} KB). Sin nombre en español: ${sinNombre}.`);
for (const g of grupos) console.log(`  ${g.n}: ${g.e.length}`);
