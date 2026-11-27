import { useState, type FormEvent, type ReactNode } from 'react'
import { useActividadesEconomicas } from '@/features/catalogos'

import type { Cliente, ClienteUpdate } from '@/features/clientes/api/gestion-clientes'
import { ErrorClientes } from '@/features/clientes/components/consulta-clientes'
import { Field, fieldClassName } from '@/features/clientes/components/form-fields'
import { Button, Input } from '@/shared/ui'

type Campo = keyof ClienteUpdate
type Seccion = 'ordinarios' | 'sensibles'
interface CampoTexto { campo: Campo; label: string; type?: string; min?: number; max?: number; requerido: boolean }

/**
 * E5-05 · Llegan enmascarados (`******4065`): empiezan vacíos con la máscara de placeholder y solo se
 * envían si se escribe un valor nuevo (vacío = sin cambio).
 */
const ENMASCARADOS: Campo[] = ['identificacion', 'email', 'telefonoCelular', 'telefonoConvencional']
const AYUDA_ENMASCARADO = 'Escribe el nuevo valor para cambiarlo'

const estadosCiviles = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Union Libre'] as const
/** Campos anulables: vacío se envía como null */
const anulables: Campo[] = ['telefonoConvencional', 'nombreComercial']

const contacto: CampoTexto[] = [
  { campo: 'telefonoCelular', label: 'Celular', type: 'tel', min: 7, max: 15, requerido: false },
  { campo: 'telefonoConvencional', label: 'Teléfono convencional', type: 'tel', max: 15, requerido: false },
]
const nombreComercial: CampoTexto = { campo: 'nombreComercial', label: 'Nombre comercial', max: 250, requerido: false }
const nombres: CampoTexto = { campo: 'nombres', label: 'Nombres', max: 250, requerido: true }
const identidadNatural: CampoTexto[] = [nombres, { campo: 'apellidos', label: 'Apellidos', max: 250, requerido: true }]
const identidadJuridico: CampoTexto[] = [
  { ...nombres, label: 'Nombres registrados' },
  { campo: 'razonSocial', label: 'Razón social', max: 250, requerido: true },
]
const identidadComun: CampoTexto[] = [
  { campo: 'fechaNacimiento', label: 'Fecha de nacimiento o constitución', type: 'date', requerido: true },
  { campo: 'email', label: 'Correo electrónico principal', type: 'email', min: 5, max: 150, requerido: false },
]
const selector = `${fieldClassName} w-full border text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:scheme-dark`

/**
 * E5-04 · Dos secciones que se guardan por separado: los datos ordinarios se aplican al
 * instante; los de identidad y el correo principal los aprueba otra persona.
 */
export function EditarClienteForm({ cliente, guardar, ocupado, error }: {
  cliente: Cliente
  guardar: (cambios: ClienteUpdate) => Promise<void>
  ocupado: boolean
  error: Error | null
}) {
  const [borrador, setBorrador] = useState<Partial<Record<Campo, string>>>({})
  const [enviada, setEnviada] = useState<Seccion | null>(null)
  const natural = cliente.tipoCliente === 'Natural'
  const actividades = useActividadesEconomicas()
  const original = (campo: Campo) => ENMASCARADOS.includes(campo) ? '' : String(cliente[campo as keyof Cliente] ?? '')
  const valor = (campo: Campo) => borrador[campo] ?? original(campo)
  const cambiar = (campo: Campo, texto: string) => setBorrador((previo) => ({ ...previo, [campo]: texto }))
  const valorActividad = valor('idActividadEconomica')
  const actividadEnLista = actividades.data?.some((opcion) => String(opcion.idActividadEconomica) === valorActividad)

  const textosOrdinarios = [...(natural ? [] : [nombreComercial]), ...contacto]
  const textosSensibles = [...(natural ? identidadNatural : identidadJuridico), ...identidadComun]
  const camposSeccion: Record<Seccion, Campo[]> = {
    ordinarios: [...textosOrdinarios.map((c) => c.campo), 'idActividadEconomica', ...(natural ? ['estadoCivil' as const] : [])],
    sensibles: textosSensibles.map((c) => c.campo),
  }
  const cambiados = (seccion: Seccion) =>
    camposSeccion[seccion].filter((campo) => borrador[campo] !== undefined && borrador[campo].trim() !== original(campo))

  function armar(seccion: Seccion): ClienteUpdate {
    const cambios: Record<string, unknown> = {}
    for (const campo of cambiados(seccion)) {
      const texto = (borrador[campo] ?? '').trim()
      if (campo === 'idActividadEconomica') cambios[campo] = texto ? Number(texto) : null
      else if (anulables.includes(campo)) cambios[campo] = texto || null
      else cambios[campo] = texto
    }
    return cambios as ClienteUpdate
  }

  async function enviar(seccion: Seccion, event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (ocupado || !cambiados(seccion).length) return
    setEnviada(seccion)
    try {
      await guardar(armar(seccion))
      // Solo se limpia la sección guardada; la otra conserva lo que se escribió.
      setBorrador((previo) => Object.fromEntries(Object.entries(previo).filter(([campo]) => !camposSeccion[seccion].includes(campo as Campo))))
    } catch {
      // Conserva los valores escritos para corregir o reintentar.
    }
  }

  const textos = (lista: CampoTexto[]) => lista.map((campo) => (
    <Field key={campo.campo} id={`editar-${campo.campo}`} label={campo.label} optional={!campo.requerido && !ENMASCARADOS.includes(campo.campo)}>
      <Input id={`editar-${campo.campo}`} className={fieldClassName} type={campo.type ?? 'text'}
        minLength={campo.min} maxLength={campo.max} required={campo.requerido} value={valor(campo.campo)}
        placeholder={ENMASCARADOS.includes(campo.campo) ? placeholderEnmascarado(cliente[campo.campo as keyof Cliente]) : undefined}
        pattern={campo.requerido && !campo.type ? '.*\\S.*' : undefined}
        onChange={(event) => cambiar(campo.campo, event.target.value)} />
    </Field>
  ))

  return (
    <div className="grid gap-4">
      <SeccionEdicion titulo="Datos de contacto y generales" descripcion="Se guardan al instante."
        ocupado={ocupado} hayCambios={cambiados('ordinarios').length > 0} error={enviada === 'ordinarios' ? error : null}
        boton="Guardar cambios" onSubmit={(event) => void enviar('ordinarios', event)}>
        {textos(textosOrdinarios)}
        {natural && (
          <Field id="editar-estado-civil" label="Estado civil">
            <select id="editar-estado-civil" className={selector} required value={valor('estadoCivil')}
              onChange={(event) => cambiar('estadoCivil', event.target.value)}>
              <option value="">Seleccionar</option>
              {estadosCiviles.map((estado) => <option key={estado} value={estado}>{estado === 'Union Libre' ? 'Unión libre' : estado}</option>)}
            </select>
          </Field>
        )}
        <Field id="editar-actividad" label="Actividad económica" optional>
          <select id="editar-actividad" className={selector} disabled={!actividades.data.length} value={valorActividad}
            onChange={(event) => cambiar('idActividadEconomica', event.target.value)}>
            <option value="">Sin actividad</option>
            {valorActividad && !actividadEnLista && <option value={valorActividad}>Actividad registrada (ID {valorActividad})</option>}
            {actividades.data?.map((actividad) => (
              <option key={actividad.idActividadEconomica} value={actividad.idActividadEconomica}>{actividad.descripcion}</option>
            ))}
          </select>
          {actividades.isPending && <p role="status" className="text-sm text-muted-foreground">Cargando actividades…</p>}
          {actividades.isError && <ErrorClientes error={actividades.error} reintentar={() => void actividades.refetch()} />}
        </Field>
      </SeccionEdicion>

      <SeccionEdicion titulo="Identidad y correo principal" etiqueta="Requiere aprobación"
        descripcion="Otra persona debe aprobar estos cambios; mientras tanto el cliente conserva sus datos actuales. Un cambio de nombre puede exigir un documento de respaldo."
        ocupado={ocupado} hayCambios={cambiados('sensibles').length > 0} error={enviada === 'sensibles' ? error : null}
        boton="Enviar a aprobación" onSubmit={(event) => void enviar('sensibles', event)}>
        {textos(textosSensibles)}
        <p className="text-sm text-muted-foreground sm:col-span-2">
          Para corregir la identificación utiliza la sección Documentos de la ficha.
        </p>
        <p className="text-sm text-muted-foreground sm:col-span-2">
          {cliente.emailVerificado ? 'El correo principal está verificado por el personal; si cambia, la marca se borra al aprobarse.' : 'El correo principal no está verificado.'}
        </p>
      </SeccionEdicion>
    </div>
  )
}

function placeholderEnmascarado(actual: unknown) {
  return typeof actual === 'string' && actual ? `${actual} · ${AYUDA_ENMASCARADO}` : AYUDA_ENMASCARADO
}

function SeccionEdicion({ titulo, etiqueta, descripcion, ocupado, hayCambios, error, boton, onSubmit, children }: {
  titulo: string
  etiqueta?: string
  descripcion: string
  ocupado: boolean
  hayCambios: boolean
  error: Error | null
  boton: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  const id = `seccion-${titulo.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <form aria-labelledby={id} className="grid gap-4 rounded-2xl border border-border bg-card p-5" onSubmit={onSubmit}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={id} className="text-xl font-semibold text-heading">{titulo}</h2>
        {etiqueta && <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium">{etiqueta}</span>}
      </div>
      <p className="text-sm text-muted-foreground">{descripcion}</p>
      <fieldset disabled={ocupado} className="grid gap-4 sm:grid-cols-2">{children}</fieldset>
      {error && <ErrorClientes error={error} />}
      <Button type="submit" className="justify-self-start" disabled={ocupado || !hayCambios}>
        {ocupado ? 'Guardando…' : boton}
      </Button>
    </form>
  )
}
