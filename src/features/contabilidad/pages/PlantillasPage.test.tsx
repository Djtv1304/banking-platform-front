import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { getVisibleSections } from '@/app/navigation/navigation'
import { funcionesDeRuta } from '@/app/router/funciones-ruta'
import { getAccessProfile } from '@/features/auth'
import { accionesPermitidas } from '@/shared/lib/permisos'
import { DetallePlantilla } from '@/features/contabilidad/pages/PlantillasPage'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: readonly unknown[] }) => ({
    data: queryKey.includes('detalle') ? plantilla : [plantilla],
    isFetching: false,
    isError: false,
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ isError: false, mutate: vi.fn() }),
}))

const consulta = 'contabilidad.plantillas.consultar'
const edicion = 'contabilidad.plantillas.editar'
const ruta = '/contabilidad/plantillas'
const plantilla: Parameters<typeof DetallePlantilla>[0]['plantilla'] = {
  IdPlantillaAsiento: 1, CodigoPlantilla: 'QA', Nombre: 'Depósito QA', Version: 1,
  VigenciaDesde: '2026-01-01', VigenciaHasta: null, Estado: true,
  lineas: [{ TipoMovimiento: 'DEBITO', OrigenCuenta: 'FIJA', ComponenteImporte: 'PRINCIPAL', IdCuentaContable: 1, CodigoRol: null }],
}

function politica(funciones: string[]) {
  return { activa: true as const, version: 'qa', funciones, rutas: ['/', ruta] }
}

function mostrar(funciones: string[], permisos: string[] = []) {
  const acciones = accionesPermitidas(['CONTADOR'], permisos, funciones)
  return renderToStaticMarkup(<MemoryRouter><DetallePlantilla
    tipo={1}
    plantilla={plantilla}
    seleccionar={vi.fn()}
    puedeEditar={acciones.includes('plantillasEditar')}
    puedeVerPlan={funciones.includes('contabilidad.cuentas.consultar')}
  /></MemoryRouter>)
}

describe('consulta y edición de Plantillas por función', () => {
  it.each(['/contabilidad/plantillas/', '/CONTABILIDAD/PLANTILLAS'])('la ruta %s conserva el mismo control', rutaAlternativa => {
    expect(funcionesDeRuta(rutaAlternativa)).toEqual([consulta])
  })
  it.each(['ADMIN', 'SUPERVISOR', 'AUDITOR', 'CONTADOR'])('%s puede consultar sin obtener edición', rol => {
    const autorizacion = politica([consulta])
    const rutas = getVisibleSections(getAccessProfile([rol]), [rol], [], undefined, undefined, {}, autorizacion)
      .flatMap(seccion => seccion.items.map(item => item.to))
    expect(rutas).toContain(ruta)
    expect(funcionesDeRuta(ruta)).toEqual([consulta])
    const html = mostrar([consulta])
    expect(html).toContain('Depósito QA')
    expect(html).toContain('Acceso de solo consulta')
    expect(html).not.toContain('Preparar nueva versión')
  })

  it('edición conserva el botón y desaparece al retirar la función aunque WorkOS la conceda', () => {
    expect(mostrar([consulta, edicion])).toContain('Preparar nueva versión')
    expect(mostrar([consulta], ['con-plantilla-editar'])).not.toContain('Preparar nueva versión')
  })

  it('retirar consulta oculta la entrada incluso con permiso remoto de edición', () => {
    const autorizacion = politica([])
    const rutas = getVisibleSections(getAccessProfile(['CONTADOR']), ['CONTADOR'], ['plantillasEditar'], undefined, undefined, {}, autorizacion)
      .flatMap(seccion => seccion.items.map(item => item.to))
    expect(rutas).not.toContain(ruta)
  })

  it('sin el control activo mantiene la decisión anterior de WorkOS', () => {
    expect(accionesPermitidas(['ADMIN'], [])).not.toContain('plantillasEditar')
    expect(accionesPermitidas(['CONTADOR'], ['con-plantilla-editar'])).toContain('plantillasEditar')
  })

  it('no ofrece volver a Plan de cuentas si solo se concedió Plantillas', () => {
    expect(mostrar([consulta])).not.toContain('href="/contabilidad"')
    expect(mostrar([consulta, 'contabilidad.cuentas.consultar'])).toContain('href="/contabilidad"')
  })
})
