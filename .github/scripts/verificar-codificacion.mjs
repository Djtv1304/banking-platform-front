// Verifica que los archivos de texto versionados estén en UTF-8 válido y sin "mojibake":
// texto UTF-8 guardado dos veces. Suele aparecer al editar con herramientas que leen el archivo como Windows-1252.
// Usado en: node .github/scripts/verificar-codificacion.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CP1252 = 'ŒœŠšŸŽžƒˆ˜–—‘-„†-•…‰‹›€™';
const MOJIBAKE = new RegExp(
  [
    `Ã[\u0080-¿${CP1252}]`, // á é í ó ú ñ Á É Í Ó Ú Ñ ü rotos
    'Â[ -¿]', // ¡ ¿ º ª « » y espacio duro rotos
    'â€', // … “ ” ‘ ’ – — € rotos
    '�', // carácter de reemplazo: bytes que ya se perdieron
  ].join('|'),
  'u',
);

const decoder = new TextDecoder('utf-8', { fatal: true });
const archivos = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const problemas = [];
let revisados = 0;

for (const archivo of archivos) {
  let bytes;
  try {
    bytes = readFileSync(archivo);
  } catch {
    continue; // borrado en el árbol de trabajo o enlace roto
  }
  if (bytes.includes(0)) continue; // binario (imágenes, fuentes…)
  revisados++;

  let texto;
  try {
    texto = decoder.decode(bytes);
  } catch {
    problemas.push(`${archivo}: no es UTF-8 válido`);
    continue;
  }

  texto.split('\n').forEach((linea, i) => {
    const hallazgo = linea.match(MOJIBAKE);
    if (hallazgo) {
      problemas.push(`${archivo}:${i + 1}: "${hallazgo[0]}" en «${linea.trim().slice(0, 120)}»`);
      console.error(`::error file=${archivo},line=${i + 1}::Texto con codificación rota ("${hallazgo[0]}")`);
    }
  });
}

if (problemas.length > 0) {
  console.error(`\nSe encontraron ${problemas.length} problema(s) de codificación:`);
  for (const p of problemas) console.error(` - ${p}`);
  console.error('\nVuelve a guardar el archivo en UTF-8 y corrige los acentos (ó, é, ñ, …).');
  process.exit(1);
}

console.log(`Codificación OK: ${revisados} archivos de texto en UTF-8 sin acentos rotos.`);
