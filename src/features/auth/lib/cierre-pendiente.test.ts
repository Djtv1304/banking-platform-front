import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { borrarCierrePendiente, guardarCierrePendiente, leerCierrePendiente } from '@/features/auth/lib/cierre-pendiente'

// E0-07 · ASVS 14.3.3: nada de datos personales ni tokens en el almacenamiento del navegador
const PATRONES_PROHIBIDOS = [/eyJ/, /Bearer/i, /access_token/i, /refresh/i, /\b\d{10}\b/, /@/, /Operador demo/i]

describe('cierre pendiente (sessionStorage)', () => {
  let guardado: Map<string, string>

  beforeEach(() => {
    guardado = new Map()
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => guardado.get(k) ?? null,
      setItem: (k: string, v: string) => void guardado.set(k, v),
      removeItem: (k: string) => void guardado.delete(k),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('guarda sólo la ruta: sin query (cédula, búsqueda) ni hash', () => {
    guardarCierrePendiente({ motivo: 'SESION_INACTIVA', returnTo: '/clientes?cedula=1712345675&q=Ana%20Pérez#fila' })
    expect(leerCierrePendiente()).toEqual({ motivo: 'SESION_INACTIVA', returnTo: '/clientes' })
    const valores = [...guardado.values()].join(' ')
    for (const patron of PATRONES_PROHIBIDOS) expect(valores).not.toMatch(patron)
    expect(valores).not.toContain('Ana')
  })

  it('conserva la ruta de la pantalla donde se estaba', () => {
    guardarCierrePendiente({ motivo: 'SESION_INACTIVA', returnTo: '/organizacion/agencias' })
    expect(leerCierrePendiente()?.returnTo).toBe('/organizacion/agencias')
  })

  it('descarta destinos externos y funciona sin returnTo', () => {
    guardarCierrePendiente({ motivo: 'SESION_INACTIVA', returnTo: '//sitio-malicioso.com' })
    expect(leerCierrePendiente()).toEqual({ motivo: 'SESION_INACTIVA', returnTo: undefined })
    borrarCierrePendiente()
    expect(leerCierrePendiente()).toBeNull()
  })
})
