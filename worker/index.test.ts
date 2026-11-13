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

    expect(response).toBe(upstream)
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

    expect(response).toBe(upstream)
    expect(response.headers.getSetCookie()).toHaveLength(2)
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

  it('mantiene el error controlado cuando el backend no responde', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(new Error('unavailable')))

    const response = await worker.fetch(incomingRequest(`https://${PREVIEW_HOST}/api/v1/auth/me`), createEnv())

    expect(response.status).toBe(502)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toMatchObject({ detail: { code: 'BACKEND_NO_DISPONIBLE' } })
  })
})
