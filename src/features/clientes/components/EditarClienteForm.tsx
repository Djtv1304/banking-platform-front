import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { Cliente, ClienteUpdate } from '@/features/clientes/api/gestion-clientes'
import { ErrorClientes } from '@/features/clientes/components/consulta-clientes'
import { Field } from '@/features/clientes/components/form-fields'
import { apiClient } from '@/shared/api'
import { Button, Input } from '@/shared/ui'

const estadosCiviles = ['Soltero', 'Casado', 'Divorciado', 'Viudo', 'Union Libre']
const camposComunes = [
  { campo: 'telefonoCelular', label: 'Celular', type: 'tel', min: 7, max: 15, requerido: true },
  { campo: 'telefonoConvencional', label: 'Teléfono convencional', type: 'tel', max: 15, requerido: false },
  { campo: 'email', label: 'Correo electrónico', type: 'email', min: 5, max: 150, requerido: true },
] as const
const nombres = { campo: 'nombres', label: 'Nombres', max: 250, requerido: true } as const
const camposNatural = [nombres, { campo: 'apellidos', label: 'Apellidos', max: 250, requerido: true }] as const
const camposJuridico = [
  { ...nombres, label: 'Nombres registrados' },
  { campo: 'razonSocial', label: 'Razón social', max: 250, requerido: true },
  { campo: 'nombreComercial', label: 'Nombre comercial', max: 250, requerido: false },
] as const
const selector = 'h-10 rounded-lg border border-border bg-field px-3'

interface Actividad {
  idActividadEconomica: number
  descripcion: string
}

export function EditarClienteForm({ cliente, guardar, ocupado, error }: {
  cliente: Cliente
  guardar: (cambios: ClienteUpdate) => Promise<void>
  ocupado: boolean
  error: Error | null
}) {
  const [borrador, setBorrador] = useState<Partial<Record<keyof ClienteUpdate, string>>>({})
  const natural = cliente.tipoCliente === 'Natural'
  const campos = [...(natural ? camposNatural : camposJuridico), ...camposComunes]
  const actividades = useQuery({
    queryKey: ['c04-actividades-economicas'],
    queryFn: async ({ signal }) => (await apiClient.get<Actividad[]>('/api/v1/catalogos/actividades-economicas', { signal })).data,
    gcTime: 0,
  })
  const valor = (campo: keyof ClienteUpdate) => borrador[campo] ?? String(cliente[campo] ?? '')
  const cambiar = (campo: keyof ClienteUpdate, texto: string) => setBorrador((previo) => ({ ...previo, [campo]: texto }))
  const valorActividad = valor('idActividadEconomica')
  const actividadEnLista = actividades.data?.some((opcion) => String(opcion.idActividadEconomica) === valorActividad)
  const hayCambios = Object.entries(borrador).some(([campo, texto]) => texto.trim() !== String(cliente[campo as keyof ClienteUpdate] ?? ''))

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (ocupado || !hayCambios) return
    const cambios: ClienteUpdate = {}
    for (const { campo } of campos) {
      const texto = borrador[campo]?.trim()
      if (texto === undefined || texto === String(cliente[campo] ?? '')) continue
      if (campo === 'telefonoConvencional' || campo === 'nombreComercial') {
        cambios[campo] = texto || null
      } else {
        cambios[campo] = texto
      }
    }
    if (natural && borrador.estadoCivil && borrador.estadoCivil !== cliente.estadoCivil) {
      cambios.estadoCivil = borrador.estadoCivil
    }
    if (borrador.idActividadEconomica !== undefined && valorActividad !== String(cliente.idActividadEconomica ?? '')) {
      cambios.idActividadEconomica = valorActividad ? Number(valorActividad) : null
    }
    try {
      await guardar(cambios)
      setBorrador({})
    } catch {
      // Conserva los valores escritos para corregir o reintentar.
    }
  }

  return (
    <form className="grid gap-4 rounded-2xl border border-border bg-card p-5" onSubmit={(event) => void enviar(event)}>
      <h2 className="text-xl font-semibold text-heading">Editar datos</h2>
      <fieldset disabled={ocupado} className="grid gap-4 sm:grid-cols-2">
        {campos.map((campo) => (
          <Field key={campo.campo} id={`editar-${campo.campo}`} label={campo.label} optional={!campo.requerido}>
            <Input id={`editar-${campo.campo}`} type={'type' in campo ? campo.type : 'text'}
              minLength={'min' in campo ? campo.min : undefined} maxLength={campo.max}
              required={campo.requerido} value={valor(campo.campo)}
              pattern={campo.requerido && !('type' in campo) ? '.*\\S.*' : undefined}
              onChange={(event) => cambiar(campo.campo, event.target.value)} />
          </Field>
        ))}
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
          <select id="editar-actividad" className={selector} disabled={!actividades.data} value={valorActividad}
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
      </fieldset>
      {error && <ErrorClientes error={error} />}
      <Button type="submit" className="justify-self-start" disabled={ocupado || !hayCambios}>
        {ocupado ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
