import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { EstadoDestino } from '@/features/clientes/api/gestion-clientes'
import { EstadoClienteForm } from '@/features/clientes/components/EstadoClienteForm'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))

const AVISO = 'Este cambio requiere la aprobación de un supervisor o administrador y no se aplica hasta entonces.'
const ALERTA_ELIMINAR = 'Eliminar es irreversible: el cliente no podrá volver a operar y sus datos personales se anonimizarán al aprobarse. El documento queda reservado.'

const render = (
  estadoActual: string,
  opciones: EstadoDestino[],
  valoresIniciales?: { destino?: EstadoDestino; motivo?: string; palabraConfirmacion?: string },
  ocupado = false,
) =>
  renderToStaticMarkup(
    <EstadoClienteForm
      estadoActual={estadoActual}
      opciones={opciones}
      guardar={vi.fn()}
      ocupado={ocupado}
      error={null}
      valoresIniciales={valoresIniciales}
    />,
  )

describe('EstadoClienteForm · aviso y botón según destino (E5-07)', () => {
  it.each([
    ['Activo', 'Inactivo', false, 'Confirmar cambio de estado'],
    ['Activo', 'Suspendido', false, 'Confirmar cambio de estado'],
    ['Activo', 'Bloqueado', true, 'Enviar a aprobación'],
    ['Bloqueado', 'Activo', true, 'Enviar a aprobación'],
    ['Activo', 'Eliminado', true, 'Enviar a aprobación'],
    ['Inactivo', 'Activo', false, 'Confirmar cambio de estado'],
  ] as const)('desde %s hacia %s (requiereAprobacion=%s)', (actual, destino, requiere, textoBoton) => {
    const html = render(actual, [destino], { destino, motivo: 'Motivo de prueba' })
    expect(html.includes(AVISO)).toBe(requiere)
    expect(html.includes(textoBoton)).toBe(true)
  })

  it('muestra mensaje cuando no hay opciones disponibles', () => {
    const html = render('Eliminado', [])
    expect(html).toContain('No hay cambios de estado disponibles.')
  })

  it('muestra contador y tope de 300 caracteres en el motivo', () => {
    const html = render('Activo', ['Inactivo'], { destino: 'Inactivo', motivo: 'Cambio temporal' })
    expect(html).toContain('maxLength="300"')
    expect(html).toContain('15/300 caracteres.')
  })

  it('muestra texto ocupado cuando se está guardando', () => {
    const html = render('Activo', ['Inactivo'], { destino: 'Inactivo', motivo: 'Cambio' }, true)
    expect(html).toContain('Guardando…')
  })
})

describe('EstadoClienteForm · confirmación al eliminar', () => {
  it.each([
    ['sin palabra', '', true],
    ['palabra incorrecta', 'ELIMINA', true],
    ['palabra ELIMINAR', 'ELIMINAR', false],
    ['palabra ELIMINAR con espacios', '  ELIMINAR  ', false],
  ])('%s (deshabilitado=%s)', (_caso, palabra, deshabilitado) => {
    const html = render('Activo', ['Eliminado'], {
      destino: 'Eliminado',
      motivo: 'Cierre de cuenta',
      palabraConfirmacion: palabra,
    })
    expect(html).toContain(ALERTA_ELIMINAR)
    expect(html).toContain('Para confirmar, escribe la palabra ELIMINAR')
    const boton = html.match(/<button[^>]*type="submit"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? ''
    // El atributo, no las clases de Tailwind `disabled:...`
    expect(/\sdisabled=""/.test(boton)).toBe(deshabilitado)
  })
})
