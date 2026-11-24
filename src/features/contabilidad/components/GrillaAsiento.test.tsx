import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import { GrillaAsiento } from '@/features/contabilidad/components/GrillaAsiento'
import { useGrillaAsiento } from '@/features/contabilidad/hooks/useGrillaAsiento'
import { lineaVacia, MENSAJES_GRILLA, type LineaBorrador } from '@/features/contabilidad/lib/grilla-asiento'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))

const cuenta = (id: number, codigo: string, extra: Partial<CuentaContable> = {}): CuentaContable => ({
  idCuentaContable: id,
  codigoCuenta: codigo,
  nombreCuenta: `Cuenta ${codigo}`,
  naturaleza: 'DEUDORA',
  tipoCuenta: 'ACTIVO',
  idCuentaSuperior: null,
  esImputable: true,
  saldo: 0,
  estado: 'Activo',
  ...extra,
})

const PLAN = [cuenta(1, '1101', { esImputable: false }), cuenta(2, '110105'), cuenta(3, '210135'), cuenta(4, '110110', { estado: 'Inactivo' })]

const linea = (texto: string, debe = '', haber = ''): LineaBorrador => ({ ...lineaVacia(), cuenta: texto, debe, haber })

function Prueba({ lineas, mostrarErrores, deshabilitada }: { lineas?: LineaBorrador[]; mostrarErrores?: boolean; deshabilitada?: boolean }) {
  const grilla = useGrillaAsiento(PLAN, lineas)
  return <GrillaAsiento id="g" grilla={grilla} mostrarErrores={mostrarErrores} deshabilitada={deshabilitada} />
}

const render = (props: Parameters<typeof Prueba>[0] = {}) => renderToStaticMarkup(<Prueba {...props} />)

describe('GrillaAsiento', () => {
  it('arranca con dos líneas vacías, totales en cero y Quitar deshabilitado', () => {
    const html = render()
    expect(html.match(/aria-label="Cuenta de la línea \d"/g)).toHaveLength(2)
    expect(html).toContain('Escribe los montos de las líneas.')
    expect(html.match(/\$0,00/g)).toHaveLength(2)
    expect(html.match(/aria-label="Quitar la línea \d"[^>]*disabled=""/g)).toHaveLength(2)
  })

  it('cada control tiene nombre accesible por línea y la tabla, su leyenda', () => {
    const html = render()
    for (const nombre of ['Cuenta de la línea 1', 'Debe de la línea 1', 'Haber de la línea 2']) expect(html).toContain(`aria-label="${nombre}"`)
    expect(html).toContain('<caption class="sr-only">')
    expect(html).toMatch(/<th scope="col"[^>]*>Debe<\/th>/)
  })

  it('el cuadre se anuncia con role=status y aria-live', () => {
    const html = render({ lineas: [linea('110105', '100'), linea('210135', '', '40')] })
    expect(html).toMatch(/role="status" aria-live="polite"[^>]*>Faltan \$60,00 en el haber\./)
    expect(html).toContain('$100,00')
    expect(html).toContain('$40,00')
  })

  it('la datalist ofrece sólo las cuentas elegibles', () => {
    const html = render()
    expect(html).toContain('value="110105 · Cuenta 110105"')
    expect(html).toContain('value="210135 · Cuenta 210135"')
    expect(html).not.toContain('value="1101 · Cuenta 1101"')
    expect(html).not.toContain('value="110110 · Cuenta 110110"')
    expect(html.match(/list="g-cuentas"/g)).toHaveLength(2)
  })

  it('sin intento de guardar no muestra errores; con mostrarErrores los liga al campo', () => {
    const lineas = [linea('1101', '5', '5'), linea('210135', '', '10')]
    expect(render({ lineas })).not.toContain(MENSAJES_GRILLA.cuentaDeGrupo('1101'))

    const html = render({ lineas, mostrarErrores: true })
    const clave = lineas[0].clave
    expect(html).toContain(MENSAJES_GRILLA.cuentaDeGrupo('1101'))
    expect(html).toContain(MENSAJES_GRILLA.montoEnAmbos)
    expect(html).toContain(`aria-describedby="g-${clave}-error-cuenta"`)
    expect(html).toContain(`id="g-${clave}-error-cuenta"`)
    expect(html.match(new RegExp(`aria-describedby="g-${clave}-error-monto"`, 'g'))).toHaveLength(2)
    expect(html).toMatch(/aria-invalid="true"/)
  })

  it('muestra el nombre de la cuenta cuando sólo se escribió el código', () => {
    const html = render({ lineas: [linea('110105', '5'), linea('210135 · Cuenta 210135', '', '5')] })
    expect(html.match(/>Cuenta 110105<\/p>/g)).toHaveLength(1)
    expect(html).not.toContain('>Cuenta 210135</p>')
    expect(html).toContain('El asiento cuadra.')
  })

  it('con tres líneas se puede quitar; deshabilitada no deja editar', () => {
    expect(render({ lineas: [linea('110105', '5'), linea('', ''), linea('210135', '', '5')] })).not.toMatch(/aria-label="Quitar la línea 1"[^>]*disabled/)
    const html = render({ deshabilitada: true })
    expect(html.match(/disabled=""/g)!.length).toBeGreaterThanOrEqual(7)
  })
})
