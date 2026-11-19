// Verifica que los archivos de texto versionados estén en UTF-8 válido y sin "mojibake":
// texto UTF-8 guardado dos veces. Suele aparecer al editar con herramientas que leen el archivo como Windows-1252.
// Recibe la lista de archivos por stdin (sin lanzar procesos desde el script):
//   git ls-files -z | node .github/scripts/verificar-codificacion.mjs   (o: npm run check:codificacion)
import { readFileSync } from 'node:fs';

// Este archivo contiene los propios patrones: se excluye para que no se marque a sí mismo
const ESTE_ARCHIVO = '.github/scripts/verificar-codificacion.mjs';

// Mantener los escapes \uXXXX: escritos como caracteres literales serían ellos mismos mojibake.
// Caracteres de Windows-1252 que ocupan el lugar de los bytes 0x80-0x9F
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

if (process.stdin.isTTY) {
  console.error('::error::Pasa la lista de archivos por stdin: git ls-files -z | node .github/scripts/verificar-codificacion.mjs');
  process.exit(1);
}

const decoder = new TextDecoder('utf-8', { fatal: true });
const archivos = readFileSync(0, 'utf8').split('\0').filter((a) => a && a !== ESTE_ARCHIVO);
// Una lista vacía significa que git falló en la tubería: no dar el chequeo por bueno
if (archivos.length === 0) {
  console.error('::error::No se recibió ningún archivo por stdin (¿falló git ls-files?).');
  process.exit(1);
}
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
    problemas.push({ archivo, detalle: 'no es UTF-8 válido' });
    console.error(`::error file=${archivo}::${archivo} no es UTF-8 válido`);
    continue;
  }

  texto.split('\n').forEach((linea, i) => {
    const hallazgo = linea.match(MOJIBAKE);
    if (hallazgo) {
      problemas.push({ archivo, detalle: `línea ${i + 1}: "${hallazgo[0]}" en «${linea.trim().slice(0, 120)}»` });
      console.error(`::error file=${archivo},line=${i + 1}::Texto con codificación rota ("${hallazgo[0]}") en ${archivo}`);
    }
  });
}

if (problemas.length > 0) {
  const afectados = [...new Set(problemas.map((p) => p.archivo))];
  console.error(`\nSe encontraron ${problemas.length} problema(s) de codificación en ${afectados.length} archivo(s):`);
  for (const archivo of afectados) {
    console.error(`\n${archivo}`);
    for (const p of problemas.filter((x) => x.archivo === archivo)) console.error(`  - ${p.detalle}`);
  }
  console.error('\nVuelve a guardar el archivo en UTF-8 y corrige los acentos (ó, é, ñ, …).');
  process.exit(1);
}

console.log(`Codificación OK: ${revisados} archivos de texto en UTF-8 sin acentos rotos.`);
