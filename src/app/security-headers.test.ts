import { describe, expect, it } from 'vitest'
// index.html y public/_headers están fuera de src/, así que el alias '@/' no los alcanza
// eslint-disable-next-line no-restricted-imports
import indexHtml from '../../index.html?raw'
// eslint-disable-next-line no-restricted-imports
import headers from '../../public/_headers?raw'

async function sha256Base64(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
}

function directive(csp: string, name: string) {
  return csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `))
}

const csp = headers.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1] ?? ''

describe('public/_headers', () => {
  it('define una CSP', () => {
    expect(csp).not.toBe('')
  })

  it('permite por hash cada <script> inline de index.html (y nada de unsafe-inline en scripts)', async () => {
    const inline = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])
    expect(inline.length).toBeGreaterThan(0)
    const scriptSrc = directive(csp, 'script-src') ?? ''
    expect(scriptSrc).not.toContain('unsafe-inline')
    for (const code of inline) {
      expect(scriptSrc).toContain(`'sha256-${await sha256Base64(code)}'`)
    }
  })

  it('no deja incrustar la app en iframes ni enviar la URL completa a otros sitios', () => {
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(headers).toMatch(/^\s*X-Frame-Options: DENY$/m)
    expect(headers).toMatch(/^\s*X-Content-Type-Options: nosniff$/m)
    expect(headers).toMatch(/^\s*Referrer-Policy: strict-origin-when-cross-origin$/m)
  })
})
