// Resumen de revisión y QA de un PR, en un único comentario que se actualiza en cada corrida.
//
// Junta lo que hace falta para revisar y probar sin abrir cinco pestañas:
//   - la historia (rama `…/frontend-<n>-…` o `Refs hugo-chicaiza/Banking-Platform#<n>`) y sus criterios
//     de aceptación como lista de QA (no hay equipo de QA: cada uno prueba su flujo de punta a punta);
//   - la URL del preview de Cloudflare (sacada del comentario de su bot);
//   - el resultado de los jobs de este workflow;
//   - los archivos compartidos que toca y los otros PRs abiertos que tocan los mismos archivos.
//
// Nunca hace fallar el job: con un token de sólo lectura (forks, Dependabot) o si la API falla,
// deja el resumen en la página del job y sigue. Todas las entradas llegan por variables de entorno.

import { appendFileSync } from 'node:fs'

const {
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  GITHUB_STEP_SUMMARY,
  GITHUB_API_URL = 'https://api.github.com',
  PR_NUMBER,
  RESULTADOS = '{}',
  REPO_HISTORIAS = 'hugo-chicaiza/Banking-Platform',
  /** `1` = sólo imprime el resumen, sin comentar (para probarlo en local) */
  SOLO_RESUMEN,
} = process.env

const MARCADOR = '<!-- pr-resumen -->'
const MAX_PRS_A_CRUZAR = 25

/** Nombre visible de cada job del workflow (los ids son los de ci-calidad-y-seguridad.yml) */
const JOBS = {
  calidad: 'Calidad (lint · tipos · build)', // incluye las pruebas de Vitest
  dependencias: 'Dependencias (npm audit)',
  secretos: 'Secretos (Gitleaks)',
  sast: 'SAST (Semgrep)',
  contrato: 'Contrato (backend desplegado)',
}

const ICONOS = { success: '✅', failure: '❌', cancelled: '⏹️', skipped: '⏭️' }

/** Archivos que suelen tocar varias historias a la vez: un cambio aquí se coordina antes de mergear */
const COMPARTIDOS = [
  [/^src\/app\//, 'app (router, layouts, proveedores)'],
  [/^src\/shared\//, 'shared'],
  [/^src\/features\/[^/]+\/index\.ts$/, 'barril de una feature'],
  [/^src\/styles\//, 'estilos globales'],
  [/^package(-lock)?\.json$/, 'dependencias'],
  [/^(vite|vitest)\.config\.ts$|^tsconfig.*\.json$|^eslint\.config\.js$|^components\.json$/, 'configuración'],
  [/^worker\/|^wrangler\.jsonc$/, 'Worker de Cloudflare'],
  [/^\.github\//, 'CI'],
]

async function gh(ruta, opciones = {}) {
  const respuesta = await fetch(`${GITHUB_API_URL}${ruta}`, {
    ...opciones,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'pr-resumen',
      ...opciones.headers,
    },
  })
  if (!respuesta.ok) throw new Error(`${opciones.method ?? 'GET'} ${ruta} → HTTP ${respuesta.status}`)
  return respuesta.status === 204 ? null : respuesta.json()
}

/** Pide todas las páginas de un listado (máximo `paginas` × 100 elementos) */
async function todo(ruta, paginas = 5) {
  const elementos = []
  for (let pagina = 1; pagina <= paginas; pagina++) {
    const separador = ruta.includes('?') ? '&' : '?'
    const lote = await gh(`${ruta}${separador}per_page=100&page=${pagina}`)
    elementos.push(...lote)
    if (lote.length < 100) break
  }
  return elementos
}

/** Lo que viene de otros (títulos, nombres de archivo) no debe romper la tabla ni el código en línea */
function limpio(texto) {
  return String(texto).replaceAll('`', "'").replaceAll('|', '/').replace(/\s+/g, ' ').trim()
}

function numeroDeHistoria(pr) {
  const porRama = pr.head.ref.match(/frontend-(\d+)/)
  if (porRama) return Number(porRama[1])
  const repo = REPO_HISTORIAS.replace('/', '\\/')
  const porCuerpo = (pr.body ?? '').match(new RegExp(`Refs\\s+${repo}#(\\d+)`, 'i'))
  return porCuerpo ? Number(porCuerpo[1]) : undefined
}

function criteriosDeAceptacion(cuerpo) {
  const seccion = (cuerpo ?? '').split(/^##\s+/m).find((parte) => /^criterios de aceptaci[oó]n/i.test(parte))
  if (!seccion) return []
  return [...seccion.matchAll(/^\s*- \[[ xX]\]\s+(.+)$/gm)].map((coincidencia) => coincidencia[1].trim())
}

function categoriaCompartida(archivo) {
  return COMPARTIDOS.find(([patron]) => patron.test(archivo))?.[1]
}

function urlDelPreview(comentarios) {
  for (const comentario of comentarios) {
    if (!comentario.user?.login?.startsWith('cloudflare-workers-and-pages')) continue
    const url = comentario.body?.match(/Preview URL:\s*(https:\/\/[^\s)]+\.workers\.dev)/)
    if (url) return url[1]
  }
  return undefined
}

async function solapes(pr, archivos) {
  const propios = new Set(archivos)
  const abiertos = await gh(`/repos/${GITHUB_REPOSITORY}/pulls?state=open&per_page=${MAX_PRS_A_CRUZAR}`)
  const resultado = []
  for (const otro of abiertos) {
    if (otro.number === pr.number) continue
    const suyos = (await todo(`/repos/${GITHUB_REPOSITORY}/pulls/${otro.number}/files`, 3)).map((a) => a.filename)
    const comunes = suyos.filter((archivo) => propios.has(archivo))
    if (comunes.length) resultado.push({ pr: otro, comunes })
  }
  return resultado
}

function seccionGates() {
  let necesidades = {}
  try {
    necesidades = JSON.parse(RESULTADOS)
  } catch {
    // sin resultados: la tabla queda vacía
  }
  const filas = Object.entries(JOBS).map(([id, nombre]) => {
    const resultado = necesidades[id]?.result ?? 'sin dato'
    return `| ${nombre} | ${ICONOS[resultado] ?? '❔'} ${resultado} |`
  })
  return [
    '### Gates de este workflow',
    '',
    '| Job | Resultado |',
    '|---|---|',
    ...filas,
    '',
    '_«Nombre de rama» y SonarCloud son checks aparte; `develop` exige SonarCloud y `master` todos los de arriba salvo Contrato._',
  ]
}

async function armarResumen(pr) {
  const lineas = [MARCADOR, '## Resumen para revisión y QA', '']
  const avisos = []

  // Historia y criterios
  const numero = numeroDeHistoria(pr)
  let criterios = []
  if (numero) {
    try {
      const historia = await gh(`/repos/${REPO_HISTORIAS}/issues/${numero}`)
      criterios = criteriosDeAceptacion(historia.body)
      lineas.push(`**Historia:** [${limpio(historia.title)}](${historia.html_url}) · estado del issue: ${historia.state}`)
    } catch (error) {
      avisos.push(`No se pudo leer la historia #${numero} de ${REPO_HISTORIAS}: ${error.message}`)
      lineas.push(`**Historia:** ${REPO_HISTORIAS}#${numero}`)
    }
  } else {
    lineas.push(
      `**Historia:** ⚠️ no se encontró. Nombra la rama \`feat/frontend-<n>-<slug>\` o agrega \`Refs ${REPO_HISTORIAS}#<n>\` al cuerpo.`,
    )
  }

  // Preview
  let comentarios = []
  try {
    comentarios = await todo(`/repos/${GITHUB_REPOSITORY}/issues/${pr.number}/comments`, 3)
  } catch (error) {
    avisos.push(`No se pudieron leer los comentarios: ${error.message}`)
  }
  const preview = urlDelPreview(comentarios)
  lineas.push(
    preview
      ? `**Preview:** ${preview}`
      : '**Preview:** todavía no hay (Cloudflare lo comenta en el PR cuando termina su build).',
    '',
  )

  // Lista de QA
  lineas.push('### Cómo hacer QA', '', 'Probar en el preview, con sesión real y el rol que pide la historia:', '')
  if (criterios.length) lineas.push(...criterios.map((criterio) => `- [ ] ${criterio}`))
  else lineas.push('- [ ] El flujo de la historia de punta a punta (la historia no trae criterios marcados con `- [ ]`)')
  lineas.push(
    '- [ ] Errores del backend: se ve el `detail` del ProblemDetails, no un error genérico ni la pantalla en blanco',
    '- [ ] Sin sesión (401) vuelve al login y, tras iniciar sesión, regresa a la misma pantalla',
    '- [ ] Un rol sin permiso no ve la opción en el menú ni entra por URL directa',
    '- [ ] Se usa bien en el celular (375 px) y con teclado',
    '',
  )

  // Archivos compartidos y solapes
  let archivos = []
  try {
    archivos = (await todo(`/repos/${GITHUB_REPOSITORY}/pulls/${pr.number}/files`, 30)).map((a) => a.filename)
  } catch (error) {
    avisos.push(`No se pudieron listar los archivos del PR: ${error.message}`)
  }
  const compartidos = archivos
    .map((archivo) => [archivo, categoriaCompartida(archivo)])
    .filter(([, categoria]) => categoria)
  lineas.push('### Archivos compartidos', '')
  if (compartidos.length) {
    lineas.push(
      'Este PR toca archivos que otras historias también usan: sincroniza con `develop` y avisa antes de mergear.',
      '',
      ...compartidos.map(([archivo, categoria]) => `- \`${limpio(archivo)}\` · ${categoria}`),
    )
  } else {
    lineas.push('Ninguno: el cambio queda dentro de su feature.')
  }
  lineas.push('')

  if (archivos.length) {
    try {
      const cruces = await solapes(pr, archivos)
      lineas.push('### Solapes con otros PRs abiertos', '')
      if (cruces.length) {
        for (const { pr: otro, comunes } of cruces) {
          const lista = comunes.slice(0, 8).map((archivo) => `\`${limpio(archivo)}\``).join(', ')
          const mas = comunes.length > 8 ? ` y ${comunes.length - 8} más` : ''
          lineas.push(`- #${otro.number} ${limpio(otro.title)} (${limpio(otro.user.login)}): ${lista}${mas}`)
        }
      } else {
        lineas.push('Ninguno.')
      }
      lineas.push('')
    } catch (error) {
      avisos.push(`No se pudieron cruzar los otros PRs: ${error.message}`)
    }
  }

  lineas.push(...seccionGates())
  if (avisos.length) lineas.push('', '<details><summary>Avisos</summary>', '', ...avisos.map((a) => `- ${a}`), '</details>')
  lineas.push('', `<sub>Se actualiza solo en cada push · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</sub>`)
  return lineas.join('\n')
}

async function publicar(pr, cuerpo) {
  const comentarios = await todo(`/repos/${GITHUB_REPOSITORY}/issues/${pr.number}/comments`, 3)
  const anterior = comentarios.find((c) => c.user?.type === 'Bot' && c.body?.startsWith(MARCADOR))
  const opciones = { method: anterior ? 'PATCH' : 'POST', body: JSON.stringify({ body: cuerpo }) }
  const ruta = anterior
    ? `/repos/${GITHUB_REPOSITORY}/issues/comments/${anterior.id}`
    : `/repos/${GITHUB_REPOSITORY}/issues/${pr.number}/comments`
  await gh(ruta, opciones)
}

async function main() {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !PR_NUMBER) {
    console.log('Faltan GITHUB_TOKEN, GITHUB_REPOSITORY o PR_NUMBER: nada que hacer.')
    return
  }
  const pr = await gh(`/repos/${GITHUB_REPOSITORY}/pulls/${Number(PR_NUMBER)}`)
  const cuerpo = await armarResumen(pr)
  if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, `${cuerpo}\n`)
  if (SOLO_RESUMEN === '1') {
    console.log(cuerpo)
    return
  }
  try {
    await publicar(pr, cuerpo)
    console.log(`Comentario de resumen actualizado en el PR #${pr.number}.`)
  } catch (error) {
    // Forks y Dependabot corren con un token de sólo lectura: el resumen queda en la página del job
    console.log(`::warning::No se pudo comentar en el PR (${error.message}); el resumen está en la página del job.`)
  }
}

main().catch((error) => {
  console.log(`::warning::pr-resumen no terminó: ${error.message}`)
})
