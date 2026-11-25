import { useState, type MouseEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Input, Label } from '@/shared/ui'
import {
  agregarCorreo, clienteEmailNuevoSchema, correosClienteKey, eliminarCorreo, listarCorreos,
  verificarCorreoPrincipal, verificarCorreoSecundario, type ClienteEmail, type ClienteEmailNuevo,
} from '@/features/clientes/api/correos'
import { ErrorClientes } from '@/features/clientes/components/consulta-clientes'

interface Props {
  cliente: { idCliente: number; email: string; emailVerificado: boolean; estado: string }
  puedeGestionar: boolean
}
type Confirmacion = { tipo: 'principal' } | { tipo: 'verificar' | 'quitar'; correo: ClienteEmail }

const AVISO_VERIFICAR = 'El sistema no envía correos. Confirma solo si el personal comprobó que el cliente usa este correo.'
const ESTADOS_SIN_ESCRITURA = ['Bloqueado', 'Eliminado']

export function CorreosCliente({ cliente, puedeGestionar }: Props) {
  const id = cliente.idCliente
  const cache = useQueryClient()
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [etiqueta, setEtiqueta] = useState('')
  const [errorFormulario, setErrorFormulario] = useState<string | null>(null)

  const consulta = useQuery({ queryKey: correosClienteKey(id), queryFn: ({ signal }) => listarCorreos(id, signal), retry: false })
  const actualizar = () => Promise.all([
    cache.invalidateQueries({ queryKey: correosClienteKey(id) }),
    cache.invalidateQueries({ queryKey: ['clientes', 'detalle', id] }),
    cache.invalidateQueries({ queryKey: ['clientes', 'historial', id] }),
  ])
  const alta = useMutation({ mutationKey: [...correosClienteKey(id), 'agregar'], mutationFn: (datos: ClienteEmailNuevo) => agregarCorreo(id, datos), onSuccess: actualizar })
  const baja = useMutation({ mutationKey: [...correosClienteKey(id), 'quitar'], mutationFn: (idEmail: number) => eliminarCorreo(id, idEmail), onSuccess: actualizar })
  const principal = useMutation({ mutationKey: [...correosClienteKey(id), 'principal'], mutationFn: () => verificarCorreoPrincipal(id), onSuccess: actualizar })
  const secundario = useMutation({ mutationKey: [...correosClienteKey(id), 'verificar'], mutationFn: (idEmail: number) => verificarCorreoSecundario(id, idEmail), onSuccess: actualizar })

  const pendiente = alta.isPending || baja.isPending || principal.isPending || secundario.isPending
  const sinEscritura = ESTADOS_SIN_ESCRITURA.includes(cliente.estado)
  const acciones = puedeGestionar && !sinEscritura
  const errorAccion = baja.error ?? principal.error ?? secundario.error
  const correos = consulta.data ?? []

  const pedir = (c: Confirmacion) => { setAviso(null); baja.reset(); principal.reset(); secundario.reset(); setConfirmacion(c) }
  const terminar = (mensaje: string) => () => { setConfirmacion(null); setAviso(mensaje) }

  function confirmar() {
    if (!confirmacion) return
    if (confirmacion.tipo === 'principal') principal.mutate(undefined, { onSuccess: terminar('Correo principal marcado como verificado por el personal.') })
    else if (confirmacion.tipo === 'verificar') secundario.mutate(confirmacion.correo.idClienteEmail, { onSuccess: terminar('Correo secundario marcado como verificado por el personal.') })
    else baja.mutate(confirmacion.correo.idClienteEmail, { onSuccess: terminar('Correo secundario quitado.') })
  }

  function agregar(evento: MouseEvent<HTMLButtonElement>) {
    evento.preventDefault()
    setAviso(null)
    const datos = clienteEmailNuevoSchema.safeParse({ email, etiqueta })
    if (!datos.success) {
      setErrorFormulario('Revisa los datos: el correo debe tener un formato válido (5 a 150 caracteres) y la etiqueta de 1 a 30 caracteres.')
      return
    }
    setErrorFormulario(null)
    alta.mutate(datos.data, { onSuccess: () => { setEmail(''); setEtiqueta(''); setAviso('Correo secundario agregado.') } })
  }

  const panelConfirmacion = (texto: string, botonConfirmar: string) => (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-muted p-3">
      <p className="text-sm text-foreground">{texto}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pendiente} onClick={confirmar}>{pendiente ? 'Procesando…' : botonConfirmar}</Button>
        <Button type="button" size="sm" variant="outline" disabled={pendiente} onClick={() => setConfirmacion(null)}>Cancelar</Button>
      </div>
    </div>
  )

  return (
    <section aria-labelledby="titulo-correos-cliente" className="flex flex-col gap-4">
      <h3 id="titulo-correos-cliente" className="text-base font-semibold text-heading">Correos</h3>
      <div aria-live="polite">{aviso && <p role="status" className="rounded-xl border border-border bg-muted p-3 text-sm text-heading">{aviso}</p>}</div>
      {puedeGestionar && sinEscritura && <p className="text-sm text-muted-foreground">No se pueden modificar los correos porque el cliente está {cliente.estado.toLowerCase()}.</p>}
      {errorAccion && <ErrorClientes error={errorAccion} />}

      <div className="rounded-xl border border-border bg-field px-4 py-3">
        <p className="text-sm text-muted-foreground">Correo principal</p>
        {cliente.email ? <>
          <p className="flex flex-wrap items-center gap-2 break-all font-medium text-heading">{cliente.email}
            <Badge variant={cliente.emailVerificado ? 'default' : 'outline'}>{cliente.emailVerificado ? 'Verificado por el personal' : 'Sin verificar'}</Badge>
          </p>
          {acciones && !cliente.emailVerificado && confirmacion?.tipo !== 'principal' &&
            <Button type="button" size="sm" variant="outline" className="mt-2" disabled={pendiente} onClick={() => pedir({ tipo: 'principal' })}
              aria-label={`Marcar como verificado el correo principal ${cliente.email}`}>Marcar como verificado</Button>}
          {acciones && confirmacion?.tipo === 'principal' && panelConfirmacion(AVISO_VERIFICAR, 'Confirmar verificación')}
        </> : <p className="text-sm text-muted-foreground">El cliente no tiene correo principal registrado.</p>}
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-heading">Correos secundarios</h4>
        {consulta.isPending && <p role="status" className="text-sm text-muted-foreground">Cargando correos…</p>}
        {consulta.isError && <ErrorClientes error={consulta.error} reintentar={() => void consulta.refetch()} />}
        {consulta.isSuccess && correos.length === 0 && <p className="text-sm text-muted-foreground">El cliente no tiene correos secundarios.</p>}
        <ul className="flex flex-col gap-2">
          {correos.map((correo) => {
            const propia = confirmacion && confirmacion.tipo !== 'principal' && confirmacion.correo.idClienteEmail === correo.idClienteEmail ? confirmacion.tipo : null
            return <li key={correo.idClienteEmail} className="rounded-xl border border-border bg-field px-4 py-3">
              <p className="flex flex-wrap items-center gap-2 break-all font-medium text-heading">{correo.email}
                <Badge variant="secondary">{correo.etiqueta}</Badge>
                <Badge variant={correo.verificado ? 'default' : 'outline'}>{correo.verificado ? 'Verificado por el personal' : 'Sin verificar'}</Badge>
              </p>
              {acciones && !propia && <div className="mt-2 flex flex-wrap gap-2">
                {!correo.verificado && <Button type="button" size="sm" variant="outline" disabled={pendiente} onClick={() => pedir({ tipo: 'verificar', correo })}
                  aria-label={`Marcar como verificado el correo ${correo.email}`}>Marcar como verificado</Button>}
                <Button type="button" size="sm" variant="ghost" disabled={pendiente} onClick={() => pedir({ tipo: 'quitar', correo })}
                  aria-label={`Quitar el correo ${correo.email}`}>Quitar</Button>
              </div>}
              {acciones && propia === 'verificar' && panelConfirmacion(AVISO_VERIFICAR, 'Confirmar verificación')}
              {acciones && propia === 'quitar' && panelConfirmacion(`¿Quitar ${correo.email}? Dejará de aparecer entre los correos del cliente.`, 'Sí, quitar')}
            </li>
          })}
        </ul>
      </div>

      {acciones && <form noValidate className="flex flex-col gap-3 rounded-xl border border-border p-4" aria-labelledby="titulo-agregar-correo">
        <h4 id="titulo-agregar-correo" className="text-sm font-semibold text-heading">Agregar correo secundario</h4>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`correo-nuevo-${id}`}>Correo</Label>
          <Input id={`correo-nuevo-${id}`} type="email" autoComplete="off" maxLength={150} value={email} disabled={pendiente}
            aria-invalid={errorFormulario ? true : undefined} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`etiqueta-nueva-${id}`}>Etiqueta</Label>
          <Input id={`etiqueta-nueva-${id}`} maxLength={30} placeholder="Ej.: Trabajo" value={etiqueta} disabled={pendiente}
            aria-invalid={errorFormulario ? true : undefined} onChange={(e) => setEtiqueta(e.target.value)} />
        </div>
        {errorFormulario && <p role="alert" className="text-sm text-destructive">{errorFormulario}</p>}
        {alta.error && <ErrorClientes error={alta.error} />}
        <div><Button type="submit" disabled={pendiente} onClick={agregar}>{alta.isPending ? 'Agregando…' : 'Agregar correo'}</Button></div>
      </form>}
    </section>
  )
}
