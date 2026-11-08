// Verifica la integridad de package-lock.json ANTES de instalar dependencias.
// Los paquetes deben resolverse desde https://registry.npmjs.org con hash sha512.
// Bloquea dependencias desde git, tarballs externos, registros alternativos o sin hash.
import { readFileSync } from 'node:fs';

// Ruta fija: el script no acepta argumentos externos
const LOCKFILE = 'package-lock.json';
const ALLOWED_HOST = 'registry.npmjs.org';

let lock;
try {
  lock = JSON.parse(readFileSync(LOCKFILE, 'utf8'));
} catch (err) {
  console.error(`::error::No se pudo leer ${LOCKFILE}: ${err.message}`);
  process.exit(1);
}

if (!lock.lockfileVersion || lock.lockfileVersion < 2 || !lock.packages) {
  console.error('::error::Se requiere package-lock.json con lockfileVersion >= 2.');
  process.exit(1);
}

const problems = [];

for (const [path, pkg] of Object.entries(lock.packages)) {
  if (path === '') continue; // paquete raíz
  if (pkg.link) continue; // enlaces a workspaces locales
  if (pkg.inBundle) continue; // empaquetado dentro de otro paquete (sin "resolved")
  if (!path.includes('node_modules/')) continue; // carpetas de workspaces locales

  const name = path.split('node_modules/').pop();

  if (!pkg.resolved) {
    problems.push(`${name}: sin campo "resolved"`);
    continue;
  }

  let url;
  try {
    url = new URL(pkg.resolved);
  } catch {
    problems.push(`${name}: URL inválida (${pkg.resolved})`);
    continue;
  }

  if (url.protocol !== 'https:' || url.hostname !== ALLOWED_HOST || url.username || url.password) {
    problems.push(`${name}: origen no permitido (${pkg.resolved})`);
  }

  if (typeof pkg.integrity !== 'string' || !pkg.integrity.startsWith('sha512-')) {
    problems.push(`${name}: falta hash sha512`);
  }
}

if (problems.length > 0) {
  console.error(`::error::package-lock.json contiene ${problems.length} entrada(s) no permitida(s):`);
  for (const p of problems) console.error(` - ${p}`);
  process.exit(1);
}

console.log(`Lockfile OK: ${Object.keys(lock.packages).length - 1} paquetes desde ${ALLOWED_HOST} con sha512.`);
