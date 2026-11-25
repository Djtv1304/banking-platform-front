import type { ComponentProps, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api'
import * as api from '@/features/clientes/api/correos'
import { CorreosCliente } from '@/features/clientes/components/CorreosCliente'

// Entorno sin DOM: un useState persistente entre renders y botones/inputs que exponen sus manejadores
// permiten simular la interacción con renderToStaticMarkup.
const h = vi.hoisted(() => ({
  estados: [] as unknown[], indice: 0,
  botones: new Map<string, (e: { preventDefault: () => void }) => void>(),
  inputs: new Map<string, (e: { target: { value: string } }) => void>(),
  mutaciones: new Map<string, { opciones: Record<string, unknown>; mutate: ReturnType<typeof vi.fn>; error: Error | null }>(),
  consulta: {} as Record<string, unknown>,
  invalidar: vi.fn(),
}))

vi.mock('@/shared/theme', () => ({ useThemeStore: vi.fn() }))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  const useState = (inicial: unknown) => {
    const i = h.indice++
    if (!(i in h.estados)) h.estados[i] = inicial
    return [h.estados[i], (v: unknown) => { h.estados[i] = typeof v === 'function' ? v(h.estados[i]) : v }]
  }
  return { ...actual, default: { ...actual, useState }, useState }
})

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: h.invalidar }),
  useQuery: () => h.consulta,
  useMutation: (opciones: { mutationKey: unknown[] }) => {
    const clave = String(opciones.mutationKey.at(-1))
    const previa = h.mutaciones.get(clave)
    const mutacion = previa ?? { opciones, mutate: vi.fn(), error: null }
    h.mutaciones.set(clave, { ...mutacion, opciones })
    return { mutate: mutacion.mutate, reset: vi.fn(), isPending: false, error: mutacion.error }
  },
}))

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>()
  const texto = (n: ReactNode): string => Array.isArray(n) ? n.map(texto).join('') : typeof n === 'string' ? n : ''
  return {
    ...actual,
    Button: (props: ComponentProps<'button'>) => {
      h.botones.set(props['aria-label'] ?? texto(props.children), props.onClick as never)
      return <button type={props.type} aria-label={props['aria-label']} disabled={props.disabled}>{props.children}</button>
    },
    Input: (props: ComponentProps<'input'>) => {
      h.inputs.set(String(props.id), props.onChange as never)
      return <input id={props.id} value={props.value} readOnly />
    },
  }
})

vi.mock('@/features/clientes/api/correos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/clientes/api/correos')>()
  return {
    ...actual, listarCorreos: vi.fn(), agregarCorreo: vi.fn(), eliminarCorreo: vi.fn(),
    verificarCorreoPrincipal: vi.fn(), verificarCorreoSecundario: vi.fn(),
  }
})

const correos = [
  { idClienteEmail: 5, email: 'trabajo@ejemplo.com', etiqueta: 'Trabajo', verificado: false, fechaVerificacion: null, fechaCreacion: '2026-11-20T10:00:00Z' },
  { idClienteEmail: 6, email: 'casa@ejemplo.com', etiqueta: 'Casa', verificado: true, fechaVerificacion: '2026-11-21T10:00:00Z', fechaCreacion: '2026-11-20T10:00:00Z' },
]
const clienteBase = { idCliente: 42, email: 'principal@ejemplo.com', emailVerificado: false, estado: 'Activo' }

function render(cliente = clienteBase, puedeGestionar = true) {
  h.indice = 0
  h.botones.clear()
  h.inputs.clear()
  return renderToStaticMarkup(<CorreosCliente cliente={cliente} puedeGestionar={puedeGestionar} />)
}
const clic = (nombre: string) => {
  const manejador = h.botones.get(nombre)
  if (!manejador) throw new Error(`No hay botón "${nombre}"`)
  manejador({ preventDefault: () => undefined })
}
const escribir = (id: string, value: string) => h.inputs.get(id)?.({ target: { value } })
const mutacion = (clave: string) => h.mutaciones.get(clave)!
const exito = (clave: string) => (mutacion(clave).mutate.mock.calls.at(-1)?.[1] as { onSuccess: () => void }).onSuccess()

async function compruebaInvalidaciones(clave: string, variables?: unknown) {
  h.invalidar.mockClear()
  const { mutationFn, onSuccess } = mutacion(clave).opciones as { mutationFn: (v: unknown) => Promise<unknown>; onSuccess: () => Promise<unknown> }
  await mutationFn(variables)
  await onSuccess()
  expect(h.invalidar).toHaveBeenCalledWith({ queryKey: ['clientes', 'correos', 42] })
  expect(h.invalidar).toHaveBeenCalledWith({ queryKey: ['clientes', 'detalle', 42] })
  expect(h.invalidar).toHaveBeenCalledWith({ queryKey: ['clientes', 'historial', 42] })
}

beforeEach(() => {
  h.estados = []
  h.mutaciones.clear()
  h.consulta = { data: correos, isPending: false, isError: false, isSuccess: true, error: null, refetch: vi.fn() }
  vi.clearAllMocks()
})

describe('E5-04 CorreosCliente', () => {
  it('lista el principal y los secundarios con su estado de verificación', () => {
    const html = render()
    expect(html).toContain('principal@ejemplo.com')
    expect(html).toContain('Sin verificar')
    expect(html).toContain('trabajo@ejemplo.com')
    expect(html).toContain('Trabajo')
    expect(html).toContain('casa@ejemplo.com')
    expect(html).toContain('Verificado por el personal')
    expect(html).toContain('Agregar correo secundario')
    expect(html).toContain('aria-label="Marcar como verificado el correo trabajo@ejemplo.com"')
    expect(html).not.toContain('aria-label="Marcar como verificado el correo casa@ejemplo.com"')
    expect(html).toContain('aria-label="Quitar el correo casa@ejemplo.com"')
  })

  it('muestra carga y error de la lista con reintento', () => {
    h.consulta = { isPending: true, isError: false, isSuccess: false }
    expect(render()).toContain('Cargando correos…')
    const refetch = vi.fn()
    h.consulta = { isPending: false, isError: true, isSuccess: false, error: new ApiError('No pudimos cargar los correos.', 500, 'x'), refetch }
    expect(render()).toContain('No pudimos cargar los correos.')
    clic('Reintentar')
    expect(refetch).toHaveBeenCalled()
  })

  it('agrega un correo válido, limpia el formulario e invalida las consultas', async () => {
    render()
    escribir('correo-nuevo-42', ' Nuevo@Ejemplo.com ')
    escribir('etiqueta-nueva-42', 'Personal')
    render()
    clic('Agregar correo')
    expect(mutacion('agregar').mutate).toHaveBeenCalledWith({ email: 'nuevo@ejemplo.com', etiqueta: 'Personal' }, expect.anything())
    exito('agregar')
    const html = render()
    expect(html).toContain('role="status"')
    expect(html).toContain('Correo secundario agregado.')
    expect(html).not.toContain('Nuevo@Ejemplo.com')
    await compruebaInvalidaciones('agregar', { email: 'nuevo@ejemplo.com', etiqueta: 'Personal' })
    expect(api.agregarCorreo).toHaveBeenCalledWith(42, { email: 'nuevo@ejemplo.com', etiqueta: 'Personal' })
  })

  it('no envía un correo inválido y lo explica', () => {
    render()
    escribir('correo-nuevo-42', 'no-es-correo')
    escribir('etiqueta-nueva-42', 'Casa')
    render()
    clic('Agregar correo')
    expect(mutacion('agregar').mutate).not.toHaveBeenCalled()
    expect(render()).toContain('Revisa los datos')
  })

  it('muestra el error EMAIL_DUPLICADO del backend', () => {
    render()
    mutacion('agregar').error = new ApiError('El correo ya está registrado para este cliente.', 409, 'EMAIL_DUPLICADO')
    const html = render()
    expect(html).toContain('role="alert"')
    expect(html).toContain('El correo ya está registrado para este cliente.')
  })

  it('quita un secundario solo después de confirmar', async () => {
    render()
    clic('Quitar el correo trabajo@ejemplo.com')
    expect(mutacion('quitar').mutate).not.toHaveBeenCalled()
    let html = render()
    expect(html).toContain('¿Quitar trabajo@ejemplo.com?')
    clic('Cancelar')
    expect(render()).not.toContain('¿Quitar')
    clic('Quitar el correo trabajo@ejemplo.com')
    render()
    clic('Sí, quitar')
    expect(mutacion('quitar').mutate).toHaveBeenCalledWith(5, expect.anything())
    exito('quitar')
    html = render()
    expect(html).toContain('Correo secundario quitado.')
    expect(html).not.toContain('¿Quitar')
    await compruebaInvalidaciones('quitar', 5)
    expect(api.eliminarCorreo).toHaveBeenCalledWith(42, 5)
  })

  it('marca el principal como verificado tras aclarar que no se envían correos', async () => {
    render()
    clic('Marcar como verificado el correo principal principal@ejemplo.com')
    expect(render()).toContain('El sistema no envía correos.')
    clic('Confirmar verificación')
    expect(mutacion('principal').mutate).toHaveBeenCalled()
    exito('principal')
    expect(render()).toContain('Correo principal marcado como verificado por el personal.')
    await compruebaInvalidaciones('principal')
    expect(api.verificarCorreoPrincipal).toHaveBeenCalledWith(42)
  })

  it('marca un secundario como verificado', async () => {
    render()
    clic('Marcar como verificado el correo trabajo@ejemplo.com')
    render()
    clic('Confirmar verificación')
    expect(mutacion('verificar').mutate).toHaveBeenCalledWith(5, expect.anything())
    await compruebaInvalidaciones('verificar', 5)
    expect(api.verificarCorreoSecundario).toHaveBeenCalledWith(42, 5)
  })

  it('muestra el error de una acción, como el límite de correos', () => {
    render()
    mutacion('quitar').error = new ApiError('El cliente alcanzó el máximo de correos secundarios.', 422, 'LIMITE_EMAILS_SECUNDARIOS')
    expect(render()).toContain('El cliente alcanzó el máximo de correos secundarios.')
  })

  it('no muestra el botón de verificar si el principal ya está verificado', () => {
    const html = render({ ...clienteBase, emailVerificado: true })
    expect(html).not.toContain('correo principal principal@ejemplo.com')
    expect(html).toContain('Verificado por el personal')
  })

  it('sin permiso de gestión solo muestra la consulta', () => {
    const html = render(clienteBase, false)
    expect(html).toContain('trabajo@ejemplo.com')
    expect(html).not.toContain('Marcar como verificado')
    expect(html).not.toContain('Quitar')
    expect(html).not.toContain('Agregar correo')
    expect(html).not.toContain('No se pueden modificar')
  })

  it.each(['Bloqueado', 'Eliminado'])('con cliente %s oculta las acciones y explica por qué', (estado) => {
    const html = render({ ...clienteBase, estado })
    expect(html).toContain('trabajo@ejemplo.com')
    expect(html).not.toContain('Marcar como verificado')
    expect(html).not.toContain('Quitar')
    expect(html).not.toContain('Agregar correo')
    expect(html).toContain(`No se pueden modificar los correos porque el cliente está ${estado.toLowerCase()}.`)
  })
})
