import { afterEach, describe, expect, it, vi } from 'vitest'
import worker from './index'

const PREVIEW_HOST = 'feat-frontend-entidad-inicial-banking-platform-front.diegosebastia94.workers.dev'
const BACKEND_URL = 'https://backend.example.com'

function incomingRequest(url: string, init?: RequestInit) {
  // Node no incorpora los metadatos de entrada de Cloudflare; el proxy no los utiliza.
  return new Request(url, init) as Parameters<typeof worker.fetch>[0]
}

function createEnv() {
  return {
    BACKEND_URL,
    ASSETS: { fetch: vi.fn() } as unknown as Fetcher,
  }
}

/** Cabeceras que debe llevar toda respuesta de /api/* (PCI SSS Módulo C §3.9) */
function expectSecurityHeaders(response: Response) {
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains')
  expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'none'; frame-ancestors 'none'")
}

afterEach(() => vi.unstubAllGlobals())

describe('proxy del Worker', () => {
  it('reconstruye el origen de la preview y descarta cabeceras falsificables', async () => {
    const upstream = new Response(null, { status: 302, headers: { Location: 'https://api.workos.com/' } })
    const fetchBackend = vi.fn<typeof fetch>().mockResolvedValue(upstream)
    vi.stubGlobal('fetch', fetchBackend)
    const request = incomingRequest(`https://${PREVIEW_HOST}/api/v1/auth/login?return_to=/organizacion/entidad`, {
      headers: {
        Host: 'attacker.example',
        'X-Forwarded-Host': 'attacker.example',
        'X-Forwarded-Proto': 'http',
        'X-Forwarded-For': '192.0.2.1',
        'CF-Connecting-IP': '192.0.2.2',
        Cookie: 'session=test',
        Origin: `https://${PREVIEW_HOST}`,
      },
    })

    const response = await worker.fetch(request, createEnv())

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toBe('https://api.workos.com/')
    expect(fetchBackend).toHaveBeenCalledOnce()
    const [target, options] = fetchBackend.mock.calls[0]
    expect(target).toBe(`${BACKEND_URL}/api/v1/auth/login?return_to=/organizacion/entidad`)
    expect(options).toMatchObject({ method: 'GET', redirect: 'manual', cache: 'no-store', body: undefined })
    const headers = new Headers(options?.headers)
    expect(headers.get('X-Forwarded-Host')).toBe(PREVIEW_HOST)
    for (const name of ['host', 'x-forwarded-proto', 'x-forwarded-for', 'cf-connecting-ip']) {
      expect(headers.has(name)).toBe(false)
    }
    expect(headers.get('Cookie')).toBe('session=test')
    expect(headers.get('Origin')).toBe(`https://${PREVIEW_HOST}`)
  })

  it('también comunica el dominio de develop sin cambiar el destino del proxy', async () => {
    const fetchBackend = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchBackend)
    const host = 'develop-banking-platform-front.diegosebastia94.workers.dev'

    await worker.fetch(incomingRequest(`https://${host}/api/v1/auth/me`), createEnv())

    const [target, options] = fetchBackend.mock.calls[0]
    expect(target).toBe(`${BACKEND_URL}/api/v1/auth/me`)
    expect(new Headers(options?.headers).get('X-Forwarded-Host')).toBe(host)
  })

  it('devuelve intactos la redirección y las cookies del callback', async () => {
    const upstream = new Response(null, { status: 302 })
    upstream.headers.set('Location', `https://${PREVIEW_HOST}/organizacion/entidad`)
    upstream.headers.append('Set-Cookie', 'session=test; HttpOnly; Secure; Path=/')
    upstream.headers.append('Set-Cookie', 'oauth_state=; Max-Age=0; Path=/')
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(upstream))

    const response = await worker.fetch(incomingRequest(`https://${PREVIEW_HOST}/api/v1/auth/callback`), createEnv())

    expect(response.status).toBe(302)
    expect(response.headers.getSetCookie()).toEqual([
      'session=test; HttpOnly; Secure; Path=/',
      'oauth_state=; Max-Age=0; Path=/',
    ])
    expect(response.headers.get('Location')).toBe(`https://${PREVIEW_HOST}/organizacion/entidad`)
  })

  it('conserva el cuerpo y el método de una escritura sin ejecutarla realmente', async () => {
    const fetchBackend = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchBackend)
    const request = incomingRequest(`https://${PREVIEW_HOST}/api/v1/organizacion/entidad`, {
      method: 'POST', body: JSON.stringify({ razonSocial: 'Prueba' }),
      headers: { 'Content-Type': 'application/json' },
    })

    await worker.fetch(request, createEnv())

    const [, options] = fetchBackend.mock.calls[0]
    expect(options?.method).toBe('POST')
    expect(options?.body).toBe(request.body)
    expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json')
  })

  it('sirve las páginas desde ASSETS sin llamar al backend', async () => {
    const fetchBackend = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchBackend)
    const page = new Response('SPA')
    const assetsFetch = vi.fn().mockResolvedValue(page)
    const request = incomingRequest(`https://${PREVIEW_HOST}/organizacion/entidad`)

    const response = await worker.fetch(request, { BACKEND_URL, ASSETS: { fetch: assetsFetch } as unknown as Fetcher })

    expect(response).toBe(page)
    expect(assetsFetch).toHaveBeenCalledWith(request)
    expect(fetchBackend).not.toHaveBeenCalled()
  })

  it('con el secreto, manda la IP de CF-Connecting-IP y no la que envía el cliente (ASVS 4.1.3)', async () => {
    const fetchBackend = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchBackend)
    const request = incomingRequest(`https://${PREVIEW_HOST}/api/v1/auth/me`, {
      headers: {
        'CF-Connecting-IP': '203.0.113.7',
        'X-Cliente-Ip': '198.51.100.66',
        'X-Proxy-Secreto': 'adivinado',
        'X-Forwarded-For': '198.51.100.66',
      },
    })

    await worker.fetch(request, { ...createEnv(), PROXY_SECRETO: 'secreto-real' })

    const headers = new Headers(fetchBackend.mock.calls[0][1]?.headers)
    expect(headers.get('X-Cliente-Ip')).toBe('203.0.113.7')
    expect(headers.get('X-Proxy-Secreto')).toBe('secreto-real')
    expect(headers.has('x-forwarded-for')).toBe(false)
    expect(headers.has('cf-connecting-ip')).toBe(false)
  })

  it('sin secreto configurado no reenvía IP ni secreto, aunque el cliente los mande', async () => {
    const fetchBackend = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchBackend)
    const request = incomingRequest(`https://${PREVIEW_HOST}/api/v1/auth/me`, {
      headers: { 'CF-Connecting-IP': '203.0.113.7', 'X-Cliente-Ip': '198.51.100.66', 'X-Proxy-Secreto': 'adivinado' },
    })

    await worker.fetch(request, createEnv())

    const headers = new Headers(fetchBackend.mock.calls[0][1]?.headers)
    expect(headers.has('x-cliente-ip')).toBe(false)
    expect(headers.has('x-proxy-secreto')).toBe(false)
  })

  it('mantiene el error controlado cuando el backend no responde', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('unavailable')))

    const response = await worker.fetch(incomingRequest(`https://${PREVIEW_HOST}/api/v1/auth/me`), createEnv())

    expect(response.status).toBe(502)
    expectSecurityHeaders(response)
    expect(await response.json()).toMatchObject({ detail: { code: 'BACKEND_NO_DISPONIBLE' } })
  })

  describe('cabeceras de seguridad de /api/*', () => {
    const API_URL = `https://${PREVIEW_HOST}/api/v1/auth/me`

    it('aplican en un 200 y sobrescriben el Cache-Control del backend', async () => {
      const upstream = new Response('{"ok":true}', {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
      })
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(upstream))

      const response = await worker.fetch(incomingRequest(API_URL), createEnv())

      expect(response.status).toBe(200)
      expectSecurityHeaders(response)
      expect(response.headers.get('Content-Type')).toBe('application/json')
      expect(await response.json()).toEqual({ ok: true })
    })

    it('aplican en un 302 sin perder status, Location ni los dos Set-Cookie', async () => {
      const upstream = new Response(null, { status: 302 })
      upstream.headers.set('Location', 'https://api.workos.com/authorize')
      upstream.headers.append('Set-Cookie', '__Host-session=abc; HttpOnly; Secure; Path=/; SameSite=Lax')
      upstream.headers.append('Set-Cookie', 'oauth_state=xyz; HttpOnly; Secure; Path=/')
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(upstream))

      const response = await worker.fetch(incomingRequest(`https://${PREVIEW_HOST}/api/v1/auth/login`), createEnv())

      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toBe('https://api.workos.com/authorize')
      expect(response.headers.getSetCookie()).toEqual([
        '__Host-session=abc; HttpOnly; Secure; Path=/; SameSite=Lax',
        'oauth_state=xyz; HttpOnly; Secure; Path=/',
      ])
      expectSecurityHeaders(response)
    })

    it('aplican en el 502 de backend caído', async () => {
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('unavailable')))

      const response = await worker.fetch(incomingRequest(API_URL), createEnv())

      expect(response.status).toBe(502)
      expectSecurityHeaders(response)
    })

    it('quitan Server y X-Powered-By del backend', async () => {
      const upstream = new Response('{}', {
        headers: { Server: 'uvicorn', 'X-Powered-By': 'FastAPI', 'X-Request-Id': 'r-1' },
      })
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(upstream))

      const response = await worker.fetch(incomingRequest(API_URL), createEnv())

      expect(response.headers.has('Server')).toBe(false)
      expect(response.headers.has('X-Powered-By')).toBe(false)
      expect(response.headers.get('X-Request-Id')).toBe('r-1')
    })

    it('al Swagger de /api/docs le da una CSP que permite Swagger UI, y al resto no', async () => {
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async () => new Response('<html></html>')))

      const docs = await worker.fetch(incomingRequest(`https://${PREVIEW_HOST}/api/docs`), createEnv())
      const csp = docs.headers.get('Content-Security-Policy') ?? ''
      expect(csp).toContain('script-src https://cdn.jsdelivr.net')
      expect(csp).toContain("connect-src 'self'")
      expect(csp).toContain("frame-ancestors 'none'")
      expect(docs.headers.get('Cache-Control')).toBe('no-store')

      const json = await worker.fetch(incomingRequest(`https://${PREVIEW_HOST}/api/openapi.json`), createEnv())
      expectSecurityHeaders(json)
      const parecida = await worker.fetch(incomingRequest(`https://${PREVIEW_HOST}/api/docs/../v1/auth/me`), createEnv())
      expectSecurityHeaders(parecida)
    })
  })
})
