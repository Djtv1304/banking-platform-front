import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { hasAnyRole, useAuthStore } from '@/features/auth'
import { cambiarComision, cambiosMetadatos, consultarTarifa, listarComisiones, type Comision } from '@/features/parametros/api/comisiones.api'
import { Aviso, Button, Cargando, ErrorApi, Input } from '@/shared/ui'

const claveLista = ['parametros', 'comisiones'] as const

export function ComisionesPage() {
  const admin = useAuthStore(s => hasAnyRole(s.user?.roles ?? [], ['ADMIN']))
  const [id, setId] = useState('')
  const lista = useQuery({ queryKey: claveLista, queryFn: ({ signal }) => listarComisiones(signal), retry: false })
  const comision = lista.data?.find(c => String(c.idComision) === id)

  return <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
    <header>
      <Link className="text-primary underline" to="/parametros">Parámetros</Link>
      <h1 className="text-[40px] font-bold tracking-tight text-heading">Comisiones</h1>
    </header>
    <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
      {lista.isPending && <Cargando texto="Cargando comisiones…" />}
      {lista.isError && <ErrorApi error={lista.error} reintentar={() => void lista.refetch()} />}
      {lista.data && <label className="block space-y-2">
        <span>Comisión</span>
        <select className="block w-full rounded-lg border border-border bg-field p-2" value={id} onChange={e => setId(e.target.value)}>
          <option value="">{lista.data.length ? 'Selecciona una comisión' : 'No hay comisiones'}</option>
          {lista.data.map(c => <option key={c.idComision} value={c.idComision}>{c.codigoComision} · {c.descripcion}</option>)}
        </select>
      </label>}
      {comision && <DetalleComision key={comision.idComision} comision={comision} admin={admin} />}
    </section>
  </main>
}

function DetalleComision({ comision, admin }: { comision: Comision; admin: boolean }) {
  const [fecha, setFecha] = useState('')
  const [fechaConsultada, setFechaConsultada] = useState('')
  const [sinCambios, setSinCambios] = useState(false)
  const cliente = useQueryClient()
  const historial = useQuery({
    queryKey: [...claveLista, comision.idComision, 'tarifa', fechaConsultada],
    queryFn: ({ signal }) => consultarTarifa(comision.idComision, fechaConsultada, signal),
    enabled: Boolean(fechaConsultada), retry: false,
  })
  const cambio = useMutation({
    mutationFn: (entrada: Parameters<typeof cambiarComision>[1]) => cambiarComision(comision.idComision, entrada),
    onSuccess: async resultado => {
      if (resultado.tipo === 'solicitud') await cliente.invalidateQueries({ queryKey: ['aprobaciones'] })
      else await cliente.invalidateQueries({ queryKey: claveLista })
    },
  })

  function guardar(e: FormEvent<HTMLFormElement>, tipo: 'tarifa' | 'metadatos') {
    e.preventDefault()
    setSinCambios(false)
    const datos = new FormData(e.currentTarget)
    if (tipo === 'tarifa') {
      cambio.mutate({ valor: String(datos.get('valor')), vigenciaDesde: String(datos.get('vigenciaDesde')) })
      return
    }
    const cuenta = datos.get('cuenta')
    const entrada = cambiosMetadatos(comision, { descripcion: String(datos.get('descripcion')).trim(), estado: datos.get('estado') === 'A' ? 'A' : 'I', idCuentaContableIngreso: cuenta ? Number(cuenta) : null })
    if (Object.keys(entrada).length) cambio.mutate(entrada)
    else { cambio.reset(); setSinCambios(true) }
  }

  return <div className="space-y-6">
    <p>{comision.tipoCalculo} · {comision.valor}{comision.tipoCalculo === 'Porcentaje' ? '%' : ''} · {comision.estado === 'A' ? 'Activa' : 'Inactiva'}</p>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (fecha === fechaConsultada) void historial.refetch(); else setFechaConsultada(fecha) }}>
      <h2 className="text-lg font-semibold">Tarifa por fecha</h2>
      <label className="block max-w-xs">Fecha<Input type="date" required value={fecha} onChange={e => setFecha(e.target.value)} /></label>
      <Button type="submit" variant="outline" disabled={historial.isFetching}>Consultar</Button>
      {historial.isFetching && <Cargando texto="Consultando tarifa…" />}
      {historial.isError && <ErrorApi error={historial.error} />}
      {historial.data && <Aviso>Tarifa al {fechaConsultada}: {historial.data.valor}{comision.tipoCalculo === 'Porcentaje' ? '%' : ''}. Vigencia desde {historial.data.vigenciaDesde}{historial.data.vigenciaHasta && ` hasta ${historial.data.vigenciaHasta}`}.</Aviso>}
    </form>
    {admin && <div className="grid gap-6 md:grid-cols-2">
      <form key={`${comision.descripcion}-${comision.estado}-${comision.idCuentaContableIngreso}`} className="space-y-3" onSubmit={e => guardar(e, 'metadatos')}>
        <h2 className="text-lg font-semibold">Editar metadatos</h2>
        <label className="block">Descripción<Input name="descripcion" required maxLength={250} defaultValue={comision.descripcion} /></label>
        <label className="block">Estado<select name="estado" defaultValue={comision.estado} className="block w-full rounded-lg border border-border bg-field p-2"><option value="A">Activa</option><option value="I">Inactiva</option></select></label>
        <label className="block">ID de cuenta contable de ingreso<Input name="cuenta" type="number" min={1} max={2147483647} defaultValue={comision.idCuentaContableIngreso ?? ''} /></label>
        <Button type="submit" disabled={cambio.isPending}>Guardar metadatos</Button>
      </form>
      <form className="space-y-3" onSubmit={e => guardar(e, 'tarifa')}>
        <h2 className="text-lg font-semibold">Solicitar cambio de tarifa</h2>
        <label className="block">Nuevo valor<Input name="valor" required inputMode="decimal" pattern="[0-9]{1,8}(\.[0-9]{1,4})?" /></label>
        <label className="block">Inicio de vigencia<Input name="vigenciaDesde" required type="date" /></label>
        <Button type="submit" disabled={cambio.isPending}>Enviar a aprobación</Button>
      </form>
    </div>}
    {cambio.isError && <ErrorApi error={cambio.error} />}
    {sinCambios && <Aviso>Los metadatos ya tienen esos valores.</Aviso>}
    {cambio.data?.tipo === 'actualizada' && <Aviso>Metadatos guardados.</Aviso>}
    {cambio.data?.tipo === 'solicitud' && <Aviso>Solicitud {cambio.data.idSolicitud} pendiente de aprobación. <Link className="underline" to={`/aprobaciones/${cambio.data.idSolicitud}`}>Consultar estado</Link></Aviso>}
  </div>
}
