import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, useNavigate } from 'react-router'

import { useAuthStore } from '@/features/auth'
import { buscarClientes, estadosCliente, listaClientesKey, type FiltrosClientes } from '@/features/clientes/api/gestion-clientes'
import { ErrorClientes, PaginacionClientes } from '@/features/clientes/components/consulta-clientes'
import { Field } from '@/features/clientes/components/form-fields'
import { accesoGestionClientes, nombreCliente } from '@/features/clientes/lib/gestion-clientes'
import { Button, Input } from '@/shared/ui'

const filtrosVacios: FiltrosClientes = { q: '', identificacion: '', tipoCliente: '', estado: '', sort: '' }
const selector = 'h-10 rounded-lg border border-border bg-field px-3'

export function BuscarClientesPage() {
  const acceso = useAuthStore((state) => accesoGestionClientes(state.user?.roles ?? []).consulta)
  const historial = useAuthStore((state) => accesoGestionClientes(state.user?.roles ?? []).historial)
  if (acceso) return <ListadoClientes />
  if (historial) return <BuscarHistorialPorId />
  return <Navigate to="/" replace />
}

function BuscarHistorialPorId() {
  const navegar = useNavigate()
  return (
    <section className="mx-auto grid w-full max-w-xl gap-4">
      <h1 className="text-3xl font-bold text-heading">Historial del cliente</h1>
      <p className="text-muted-foreground">Ingresa el ID interno del cliente para consultar su historial.</p>
      <form className="grid gap-4" onSubmit={(event) => {
        event.preventDefault()
        const id = Number(new FormData(event.currentTarget).get('id'))
        if (Number.isSafeInteger(id) && id > 0) void navegar(`/clientes/${id}`)
      }}>
        <Field id="historial-id" label="ID interno">
          <Input id="historial-id" name="id" type="number" min={1} step={1} max={Number.MAX_SAFE_INTEGER} required />
        </Field>
        <Button type="submit">Consultar historial</Button>
      </form>
    </section>
  )
}

function ListadoClientes() {
  const [busqueda, setBusqueda] = useState({ filtros: filtrosVacios, page: 1 })
  const consulta = useQuery({
    queryKey: [...listaClientesKey, busqueda],
    queryFn: ({ signal }) => buscarClientes(busqueda.filtros, busqueda.page, signal),
    gcTime: 0,
  })

  function aplicarFiltros(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const campos = new FormData(event.currentTarget)
    setBusqueda({
      filtros: {
        q: String(campos.get('q') ?? ''),
        identificacion: String(campos.get('identificacion') ?? ''),
        tipoCliente: String(campos.get('tipoCliente') ?? ''),
        estado: String(campos.get('estado') ?? ''),
        sort: String(campos.get('sort') ?? ''),
      },
      page: 1,
    })
  }

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-6">
      <div>
        <h1 className="text-3xl font-bold text-heading">Buscar clientes</h1>
        <p className="mt-2 text-muted-foreground">Encuentra al cliente y abre su ficha.</p>
      </div>
      <form className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2" onSubmit={aplicarFiltros}>
        <Field id="clientes-q" label="Búsqueda parcial">
          <Input id="clientes-q" name="q" placeholder="Nombre, razón social o identificación" />
        </Field>
        <Field id="clientes-identificacion" label="Identificación exacta">
          <Input id="clientes-identificacion" name="identificacion" />
        </Field>
        <Field id="clientes-tipo" label="Tipo de cliente">
          <select id="clientes-tipo" name="tipoCliente" className={selector}>
            <option value="">Todos</option><option value="Natural">Natural</option><option value="Juridico">Jurídico</option>
          </select>
        </Field>
        <Field id="clientes-estado" label="Estado">
          <select id="clientes-estado" name="estado" className={selector}>
            <option value="">Todos</option>
            {estadosCliente.map((estado) => <option key={estado}>{estado}</option>)}
          </select>
        </Field>
        <Field id="clientes-orden" label="Orden por ID">
          <select id="clientes-orden" name="sort" className={selector}>
            <option value="">Ascendente</option><option value="idCliente,desc">Descendente</option>
          </select>
        </Field>
        <Button type="submit" className="self-end">Buscar</Button>
      </form>
      {consulta.isPending && <p role="status">Buscando clientes…</p>}
      {consulta.isError && <ErrorClientes error={consulta.error} reintentar={() => void consulta.refetch()} />}
      {consulta.data && (
        <>
          {consulta.data.items.length ? (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {consulta.data.items.map((cliente) => (
                <li key={cliente.idCliente} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-heading">{nombreCliente(cliente)}</p>
                    <p className="text-sm text-muted-foreground">{cliente.identificacion} · {cliente.estado} · ID {cliente.idCliente}</p>
                  </div>
                  <Button asChild variant="outline"><Link to={`/clientes/${cliente.idCliente}`}>Abrir ficha</Link></Button>
                </li>
              ))}
            </ul>
          ) : <p role="status">No se encontraron clientes con esos filtros.</p>}
          <PaginacionClientes {...consulta.data} cambiar={(page) => setBusqueda({ ...busqueda, page })} />
        </>
      )}
    </section>
  )
}
