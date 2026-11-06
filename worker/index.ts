/**
 * Worker de Cloudflare: sirve la SPA (assets de ./dist) y hace de proxy de /api/* hacia FastAPI.
 *
 * Así el navegador ve frontend y API en el MISMO origen, y la cookie de sesión `__Host-session`
 * (HttpOnly, Secure, Path=/, sin Domain) queda ligada a este dominio sin CORS ni credenciales
 * cross-origin. El navegador nunca habla directamente con Azure.
 */

/**
 * Bindings declarados en wrangler.jsonc. Se tipan aquí (y no con `wrangler types` completo) porque
 * ese comando también lee el `.env` de Vite y mezclaría variables `VITE_*` que el Worker no usa.
 */
interface Env {
  ASSETS: Fetcher
  /** Origen del backend sin "/" final (wrangler.jsonc → vars) */
  BACKEND_URL: string
}

const API_PREFIX = '/api/'

/** Métodos que no llevan body */
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD'])

/**
 * Cabeceras que el cliente podría falsificar para engañar al backend (IP real, protocolo, host…).
 * `host` lo pone fetch() con el host del backend.
 */
function isHopOrSpoofableHeader(name: string) {
  return name === 'host' || name.startsWith('x-forwarded-') || name.startsWith('cf-')
}

function buildBackendHeaders(request: Request) {
  const headers = new Headers(request.headers)
  // Se juntan primero: borrar mientras se itera un Headers salta entradas
  const toDelete = [...headers.keys()].filter(isHopOrSpoofableHeader)
  for (const name of toDelete) headers.delete(name)
  return headers
}

async function proxyToBackend(request: Request, env: Env, url: URL): Promise<Response> {
  // Base fija desde la configuración: el host de destino NUNCA sale de la petición
  const target = `${env.BACKEND_URL}${url.pathname}${url.search}`

  try {
    // La respuesta se devuelve tal cual: status, Location y todos los Set-Cookie (reconstruir las
    // cabeceras podría fusionar los Set-Cookie múltiples y romper la sesión)
    return await fetch(target, {
      method: request.method,
      headers: buildBackendHeaders(request),
      body: METHODS_WITHOUT_BODY.has(request.method) ? undefined : request.body,
      // Los 302 (login → WorkOS, callback → SPA) los sigue el navegador, no el Worker
      redirect: 'manual',
      cache: 'no-store',
    })
  } catch {
    // Backend caído o inaccesible: error con la forma que entiende `toApiError` de la SPA
    return Response.json(
      { detail: { code: 'BACKEND_NO_DISPONIBLE', message: 'El servicio no está disponible. Inténtalo más tarde.' } },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname.startsWith(API_PREFIX)) return proxyToBackend(request, env, url)

    // Por run_worker_first solo /api/* llega aquí; esto cubre cualquier otro caso
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
