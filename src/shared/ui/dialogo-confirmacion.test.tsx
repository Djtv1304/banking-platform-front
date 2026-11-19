import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Dialog } from '@/shared/ui/dialog'
import { type DialogoConfirmacionProps, FormularioConfirmacion } from '@/shared/ui/dialogo-confirmacion'

// El contenido del diálogo va en un portal que no existe al renderizar en servidor: se prueba el formulario dentro de un
// Dialog abierto. Tab, Esc y el foco real los cubre el navegador (ver el informe de la historia).
const base: DialogoConfirmacionProps = {
  abierto: true,
  onAbiertoChange: vi.fn(),
  titulo: 'Anular asiento',
  descripcion: 'El asiento deja de contar en el balance.',
  textoConfirmar: 'Anular',
  onConfirmar: vi.fn(),
}
const html = (props: Partial<DialogoConfirmacionProps> = {}) =>
  renderToStaticMarkup(
    <Dialog open>
      <FormularioConfirmacion {...base} {...props} />
    </Dialog>,
  )
const botones = (salida: string) => salida.match(/<button[^>]*>/g) ?? []

describe('DialogoConfirmacion', () => {
  it('sin motivo: título, descripción y dos botones; el foco inicial es «Cancelar»', () => {
    const salida = html()
    expect(salida).toContain('Anular asiento')
    expect(salida).toContain('El asiento deja de contar en el balance.')
    expect(salida).not.toContain('<textarea')
    const [cancelar, confirmar] = botones(salida)
    expect(cancelar).toContain('data-autofocus')
    expect(confirmar).not.toContain('data-autofocus')
    expect(salida).toContain('Cancelar')
  })

  it('con motivo: campo con etiqueta, requerido, con ayuda asociada y foco inicial en el campo', () => {
    const salida = html({ motivo: { obligatorio: true } })
    expect(salida).toMatch(/<label[^>]*>Motivo<\/label>/)
    const campo = /<textarea[^>]*>/.exec(salida)?.[0] ?? ''
    expect(campo).toContain('aria-required="true"')
    expect(campo).toContain('aria-invalid="false"')
    expect(campo).toContain('data-autofocus')
    expect(campo).toMatch(/aria-describedby="[^"]*-motivo-ayuda"/)
    expect(salida).toContain('Mínimo 10 caracteres.')
    expect(salida).toContain('0/500')
    expect(botones(salida)[0]).not.toContain('data-autofocus')
  })

  it('el campo y el botón de la etiqueta se asocian por id', () => {
    const salida = html({ motivo: { obligatorio: false, etiqueta: 'Observación' } })
    const para = /<label[^>]*for="([^"]+)"/.exec(salida)?.[1]
    expect(salida).toContain('Observación (opcional)')
    expect(salida).toContain(`id="${para}"`)
    expect(salida).toContain('aria-required="false"')
  })

  it('destructiva: el botón de confirmar es de peligro; sin motivo el foco sigue en «Cancelar»', () => {
    const salida = html({ destructiva: true })
    expect(botones(salida)[1]).toContain('bg-destructive/10')
    expect(botones(salida)[0]).toContain('data-autofocus')
  })

  it('procesando: botones y campo bloqueados y el confirmar anuncia que está ocupado', () => {
    const salida = html({ procesando: true, motivo: { obligatorio: true } })
    const [cancelar, confirmar] = botones(salida)
    expect(cancelar).toContain('disabled=""')
    expect(confirmar).toContain('disabled=""')
    expect(confirmar).toContain('aria-busy="true"')
    expect(/<textarea[^>]*>/.exec(salida)?.[0]).toContain('readOnly')
  })

  it('sin procesar, los botones están habilitados', () => {
    expect(botones(html()).some((boton) => / disabled=""/.test(boton))).toBe(false)
  })
})
