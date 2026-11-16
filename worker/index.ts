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
  /**
   * Secreto compartido con el backend (`wrangler secret put PROXY_SECRETO`, nunca en el repositorio).
   * Con él, el backend confía en la IP que manda el Worker (ASVS 4.1.3, 15.3.4)
   */
  PROXY_SECRETO?: string
}

const API_PREFIX = '/api/'

/** Métodos que no llevan body */
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD'])

/**
 * Cabeceras que el cliente podría falsificar para engañar al backend (IP real, protocolo, host…).
 * `host` lo pone fetch() con el host del backend.
 */
function isHopOrSpoofableHeader(name: string) {
  return (
    name === 'host' ||
    name.startsWith('x-forwarded-') ||
    name.startsWith('cf-') ||
    name === 'x-cliente-ip' ||
    name === 'x-proxy-secreto'
  )
}

function buildBackendHeaders(request: Request, env: Env) {
  // La fija Cloudflare en el borde y el cliente no puede cambiarla. Se lee antes de limpiar las cf-*
  const clientIp = request.headers.get('CF-Connecting-IP')
  const headers = new Headers(request.headers)
  // Se juntan primero: borrar mientras se itera un Headers salta entradas
  const toDelete = [...headers.keys()].filter(isHopOrSpoofableHeader)
  for (const name of toDelete) headers.delete(name)
  // Se reconstruye desde la URL recibida por el Worker, nunca desde cabeceras del cliente.
  // El backend valida este dominio contra su lista de previews permitidas antes de usarlo.
  headers.set('X-Forwarded-Host', new URL(request.url).hostname)
  // IP real del usuario para auditoría y límites: el backend solo la acepta junto al secreto
  if (env.PROXY_SECRETO) {
    headers.set('X-Proxy-Secreto', env.PROXY_SECRETO)
    if (clientIp) headers.set('X-Cliente-Ip', clientIp)
  }
  return headers
}

/**
 * Cabeceras de seguridad de toda respuesta de /api/* (PCI SSS Módulo C §3.9, ASVS V14). Las de
 * `public/_headers` solo aplican a los assets, no a lo que genera el Worker. Son respuestas JSON o
 * redirecciones, no páginas: la CSP lo prohíbe todo y `no-store` sobrescribe lo que mande el back
 * (datos de clientes: nada se guarda en cachés intermedias ni del navegador).
 */
const API_SECURITY_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
}

/** Cabeceras del backend que delatan su stack y no deben llegar al navegador */
const LEAKY_BACKEND_HEADERS = ['X-Powered-By', 'Server']

/**
 * Devuelve la respuesta del backend con las cabeceras de seguridad aplicadas.
 *
 * Las cabeceras de una respuesta de fetch() son inmutables, así que se crea otra con
 * `new Response(body, res)`: copia status, statusText y TODAS las cabeceras, y mantiene cada
 * Set-Cookie por separado (no se fusionan en una sola cabecera) y el Location de los 302. El cuerpo
 * se pasa como stream, sin leerlo.
 *
 * Nota: Cloudflare añade después su propio `Server: cloudflare` en el borde; aquí solo se quita el
 * del backend (Azure/uvicorn).
 */
function withApiSecurityHeaders(res: Response): Response {
  const secured = new Response(res.body, res)
  for (const name of LEAKY_BACKEND_HEADERS) secured.headers.delete(name)
  for (const [name, value] of Object.entries(API_SECURITY_HEADERS)) secured.headers.set(name, value)
  return secured
}

async function proxyToBackend(request: Request, env: Env, url: URL): Promise<Response> {
  // Base fija desde la configuración: el host de destino NUNCA sale de la petición
  const target = `${env.BACKEND_URL}${url.pathname}${url.search}`

  try {
    // Status, Location y todos los Set-Cookie pasan intactos (withApiSecurityHeaders no fusiona los
    // Set-Cookie múltiples, que romperían la sesión); solo se añaden/quitan cabeceras de seguridad
    const res = await fetch(target, {
      method: request.method,
      headers: buildBackendHeaders(request, env),
      body: METHODS_WITHOUT_BODY.has(request.method) ? undefined : request.body,
      // Los 302 (login → WorkOS, callback → SPA) los sigue el navegador, no el Worker
      redirect: 'manual',
      cache: 'no-store',
    })
    return withApiSecurityHeaders(res)
  } catch {
    // Backend caído o inaccesible: error con la forma que entiende `toApiError` de la SPA
    return withApiSecurityHeaders(
      Response.json(
        { detail: { code: 'BACKEND_NO_DISPONIBLE', message: 'El servicio no está disponible. Inténtalo más tarde.' } },
        { status: 502 },
      ),
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
