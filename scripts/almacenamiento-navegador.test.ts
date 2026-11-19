import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/*
 * E0-07 · ASVS 14.3.3: en el almacenamiento del navegador no hay datos personales ni tokens (la sesión
 * vive en la cookie httpOnly del backend). Esta prueba inventaría todo uso de almacenamiento en `src`:
 * si aparece uno nuevo, falla hasta que se revise qué guarda y se agregue aquí.
 */
const ALMACENAMIENTO = /\b(localStorage|sessionStorage|indexedDB|document\.cookie)\b/

/** Lo que se guarda en cada sitio y por qué no es dato personal */
const PERMITIDOS: Record<string, string> = {
  'src/app/layouts/DashboardLayout.tsx': 'preferencia visual: menú lateral colapsado ("true"/"false")',
  'src/features/auth/lib/cierre-pendiente.ts': 'motivo del cierre y ruta sin query ni hash (ver cierre-pendiente.test.ts)',
  'src/features/aprobaciones/components/NotificacionesAprobaciones.tsx': 'ids de aprobación leídos ("<idSolicitud>:<estado>"), por id de usuario',
}

function archivosFuente(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = `${dir}/${e.name}`
    if (e.isDirectory()) return archivosFuente(ruta)
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name) ? [ruta] : []
  })
}

describe('almacenamiento del navegador (ASVS 14.3.3)', () => {
  const usan = archivosFuente('src').filter((f) => ALMACENAMIENTO.test(readFileSync(f, 'utf8')))

  it('sólo lo usan los sitios revisados', () => {
    expect(usan.sort()).toEqual(Object.keys(PERMITIDOS).sort())
  })

  it('ninguna clave ni valor escrito menciona tokens ni datos personales', () => {
    const escrituras = usan.flatMap((f) =>
      readFileSync(f, 'utf8').split('\n').filter((l) => /\.setItem\(/.test(l)).map((l) => `${f}: ${l.trim()}`),
    )
    expect(escrituras).toHaveLength(3)
    for (const linea of escrituras) {
      expect(linea).not.toMatch(/token|bearer|jwt|refresh|cedula|identificacion|email|correo|nombre|telefono|password/i)
    }
  })
})
