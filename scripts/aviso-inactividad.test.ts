import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/*
 * E0-07 · criterio 4: al aparecer el aviso de expiración no se descarta el formulario en curso.
 * El aviso es un diálogo que vive junto a la pantalla, no alrededor de ella: si envolviera al
 * <Outlet /> (o llevara una `key` que cambia), desmontaría el formulario al aparecer.
 */
describe('aviso de inactividad y pantalla en curso', () => {
  const layout = readFileSync('src/app/layouts/DashboardLayout.tsx', 'utf8')
  const aviso = readFileSync('src/features/auth/components/AvisoInactividad.tsx', 'utf8')

  it('el aviso y la pantalla (<Outlet />) son hermanos: ninguno envuelve al otro', () => {
    expect(layout.match(/<AvisoInactividad \/>/g)).toHaveLength(1)
    expect(layout.match(/<Outlet \/>/g)).toHaveLength(1)
  })

  it('el aviso se abre y se cierra con el estado de inactividad, sin navegar ni cerrar la sesión', () => {
    expect(aviso).toContain('open={venceEn !== null}')
    expect(aviso).not.toMatch(/useNavigate|<Navigate|window\.location/)
    // «Cerrar sesión» sólo ocurre si el usuario pulsa el botón
    expect(aviso.match(/signOut\(\)/g)).toHaveLength(1)
  })
})
