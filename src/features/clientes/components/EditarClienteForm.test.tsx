import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import type { Cliente } from '@/features/clientes/api/gestion-clientes'
import { EditarClienteForm } from '@/features/clientes/components/EditarClienteForm'

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))
vi.mock('@/features/catalogos', () => ({
  useActividadesEconomicas: () => ({ data: [], isPending: false, isError: false }),
}))

const natural: Cliente = {
  idCliente: 1042, identificacion: '******4065', tipoDocumento: 'C', tipoCliente: 'Natural', nombres: 'María', apellidos: 'Pérez',
  razonSocial: null, nombreComercial: null, estadoCivil: 'Soltero', idActividadEconomica: null, estado: 'Activo',
  email: 'm***@example.test', telefonoCelular: '******4567', telefonoConvencional: '******2345', fechaNacimiento: '1992-05-14',
  fechaRegistro: '2026-11-06T10:00:00Z', direcciones: [], emailVerificado: true,
}

const render = (cliente: Cliente) =>
  renderToStaticMarkup(<EditarClienteForm cliente={cliente} guardar={async () => {}} ocupado={false} error={null} />)

/** Devuelve el HTML de la sección cuyo título se indica */
function seccion(html: string, titulo: string) {
  const inicio = html.indexOf(titulo)
  const fin = html.indexOf('</form>', inicio)
  return html.slice(inicio, fin)
}

describe('E5-04 · edición por sección', () => {
  it('separa los datos ordinarios de los que requieren aprobación', () => {
    const html = render(natural)
    const ordinarios = seccion(html, 'Datos de contacto y generales')
    const sensibles = seccion(html, 'Identidad y correo principal')
    expect(ordinarios).toContain('Se guardan al instante')
    expect(ordinarios).toContain('editar-telefonoCelular')
    expect(ordinarios).toContain('editar-estado-civil')
    expect(ordinarios).not.toContain('editar-email')
    expect(sensibles).toContain('Requiere aprobación')
    for (const campo of ['nombres', 'apellidos', 'fechaNacimiento', 'email']) {
      expect(sensibles).toContain(`editar-${campo}`)
    }
    expect(sensibles).toContain('sección Documentos')
    expect(sensibles).not.toContain('editar-identificacion')
    expect(sensibles).not.toContain('editar-tipoDocumento')
    expect(sensibles).toContain('Enviar a aprobación')
    expect(sensibles).not.toContain('editar-telefonoCelular')
  })

  it('en un cliente jurídico la razón social es sensible y el nombre comercial ordinario', () => {
    const html = render({ ...natural, tipoCliente: 'Juridico', apellidos: null, estadoCivil: null, razonSocial: 'Empresa SA' })
    expect(seccion(html, 'Identidad y correo principal')).toContain('editar-razonSocial')
    expect(seccion(html, 'Datos de contacto y generales')).toContain('editar-nombreComercial')
    expect(html).not.toContain('editar-apellidos')
    expect(html).not.toContain('editar-estado-civil')
  })

  it('avisa que la marca de verificado se borra al aprobarse un cambio de correo', () => {
    expect(render(natural)).toContain('la marca se borra al aprobarse')
    expect(render({ ...natural, emailVerificado: false })).toContain('no está verificado')
  })

  it('sin cambios ambos botones quedan deshabilitados', () => {
    const botones = render(natural).match(/<button[^>]*type="submit"[^>]*>/g) ?? []
    expect(botones).toHaveLength(2)
    for (const boton of botones) expect(boton).toContain('disabled')
  })

  it('E5-05 · correo y teléfonos empiezan vacíos con la máscara de placeholder y sin required', () => {
    const html = render(natural)
    for (const [campo, mascara] of [['email', 'm***@example.test'], ['telefonoCelular', '******4567'], ['telefonoConvencional', '******2345']]) {
      const input = html.match(new RegExp(`<input[^>]*id="editar-${campo}"[^>]*>`))?.[0] ?? ''
      expect(input).toContain('value=""')
      expect(input).toContain(`placeholder="${mascara} · Escribe el nuevo valor para cambiarlo"`)
      expect(input).not.toContain('required')
    }
    expect(html).not.toContain('value="******4065"')
  })

  it('los nombres siguen precargados', () => {
    expect(render(natural)).toContain('value="María"')
  })
})
