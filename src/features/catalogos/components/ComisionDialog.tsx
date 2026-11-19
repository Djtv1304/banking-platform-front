import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { hasAnyRole, useAuthStore, usePuedeFuncion } from '@/features/auth'
import { useDetalleAprobacion } from '@/features/aprobaciones/hooks/useAprobaciones'
import { cambiarComision, cambiosMetadatos, CLAVE_GESTION_COMISIONES, consultarTarifa, invalidarComisiones, listarComisiones, type Comision } from '@/features/catalogos/api/comisiones.api'
import { getCuentasContables } from '@/features/contabilidad/api/contabilidad.api'
import { CONTABILIDAD_ROLES } from '@/features/contabilidad/api/contabilidad.contract'
import { CLAVE_PLAN_CUENTAS } from '@/features/contabilidad/hooks/usePlanCuentas'
import { Aviso, Button, Cargando, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, ErrorApi, Input } from '@/shared/ui'

const fechaInstitucional = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Guayaquil' }).format(new Date())

export function ComisionDialog({ id, puedeEditar, onCerrar }: { id: number; puedeEditar: boolean; onCerrar: () => void }) {
  const lista = useQuery({ queryKey: CLAVE_GESTION_COMISIONES, queryFn: ({ signal }) => listarComisiones(signal), retry: false, refetchOnMount: 'always' })
  const comision = lista.data?.find(c => c.idComision === id)

  return <Dialog open onOpenChange={abierto => { if (!abierto) onCerrar() }}>
    <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{comision?.codigoComision ?? 'Comisión'}</DialogTitle>
        <DialogDescription>{comision?.descripcion ?? 'Consulta de comisiones y recargos'}</DialogDescription>
      </DialogHeader>
      {lista.isPending && <Cargando texto="Cargando comisión…" />}
      {lista.isError && <ErrorApi error={lista.error} reintentar={() => void lista.refetch()} />}
      {lista.isSuccess && !comision && <Aviso>La comisión ya no está en el catálogo.</Aviso>}
      {comision && <DetalleComision comision={comision} puedeEditar={puedeEditar} />}
    </DialogContent>
  </Dialog>
}

function DetalleComision({ comision, puedeEditar }: { comision: Comision; puedeEditar: boolean }) {
  const [fecha, setFecha] = useState(fechaInstitucional)
  const [fechaConsultada, setFechaConsultada] = useState(fecha)
  const [sinCambios, setSinCambios] = useState(false)
  const [solicitud, setSolicitud] = useState(0)
  const cliente = useQueryClient()
  const roles = useAuthStore(s => s.user?.roles)
  const accesoPlan = usePuedeFuncion('contabilidad.cuentas.consultar', hasAnyRole(roles ?? [], CONTABILIDAD_ROLES.consultar))
  const cuentas = useQuery({ queryKey: CLAVE_PLAN_CUENTAS, queryFn: getCuentasContables, enabled: puedeEditar && accesoPlan, retry: false })
  const validas = cuentas.data?.filter(c => c.esImputable && c.estado === 'Activo') ?? []
  const detalleSolicitud = useDetalleAprobacion(solicitud)
  const historial = useQuery({
    queryKey: [...CLAVE_GESTION_COMISIONES, comision.idComision, 'tarifa', fechaConsultada],
    queryFn: ({ signal }) => consultarTarifa(comision.idComision, fechaConsultada, signal),
    retry: false, refetchOnMount: 'always',
  })
  const cambio = useMutation({
    mutationFn: (entrada: Parameters<typeof cambiarComision>[1]) => cambiarComision(comision.idComision, entrada),
    onSuccess: async resultado => {
      if (resultado.tipo === 'solicitud') {
        setSolicitud(resultado.idSolicitud)
        await cliente.invalidateQueries({ queryKey: ['aprobaciones'] })
      } else {
        await invalidarComisiones(cliente)
      }
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
    const cuentaIngreso = cuenta === null ? comision.idCuentaContableIngreso : cuenta === '' ? null : Number(cuenta)
    const entrada = cambiosMetadatos(comision, { descripcion: String(datos.get('descripcion')).trim(), estado: datos.get('estado') === 'A' ? 'A' : 'I', idCuentaContableIngreso: cuentaIngreso })
    if (Object.keys(entrada).length) cambio.mutate(entrada)
    else { cambio.reset(); setSinCambios(true) }
  }

  return <div className="space-y-6">
    <p>{comision.tipoCalculo} · {comision.estado === 'A' ? 'Activa' : 'Inactiva'}</p>
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (fecha === fechaConsultada) void historial.refetch(); else setFechaConsultada(fecha) }}>
      <h2 className="text-lg font-semibold">Tarifa por fecha</h2>
      <label className="block max-w-xs">Fecha<Input type="date" required value={fecha} onChange={e => setFecha(e.target.value)} /></label>
      <Button type="submit" variant="outline" disabled={historial.isFetching}>Consultar</Button>
      {historial.isFetching && <Cargando texto="Consultando tarifa…" />}
      {historial.isError && <ErrorApi error={historial.error} />}
      {historial.data && !historial.isError && <Aviso>Tarifa al {fechaConsultada}: {historial.data.valor}{comision.tipoCalculo === 'Porcentaje' ? '%' : ''}. Vigencia desde {historial.data.vigenciaDesde}{historial.data.vigenciaHasta && ` hasta antes del ${historial.data.vigenciaHasta}`}.</Aviso>}
    </form>
    {puedeEditar && <div className="grid gap-6 md:grid-cols-2">
      <form key={`${comision.descripcion}-${comision.estado}-${comision.idCuentaContableIngreso}`} className="space-y-3" onSubmit={e => guardar(e, 'metadatos')}>
        <h2 className="text-lg font-semibold">Editar metadatos</h2>
        <label className="block">Descripción<Input name="descripcion" required maxLength={250} defaultValue={comision.descripcion} /></label>
        <label className="block">Estado<select name="estado" defaultValue={comision.estado} className="block w-full rounded-lg border border-border bg-field p-2"><option value="A">Activa</option><option value="I">Inactiva</option></select></label>
        <label className="block">Cuenta contable de ingreso
          <select key={String(cuentas.isSuccess)} name="cuenta" disabled={!accesoPlan || !cuentas.isSuccess} defaultValue={comision.idCuentaContableIngreso ?? ''} className="block w-full rounded-lg border border-border bg-field p-2">
            <option value="">Sin cuenta asignada</option>
            {comision.idCuentaContableIngreso !== null && !validas.some(c => c.idCuentaContable === comision.idCuentaContableIngreso) &&
              <option value={comision.idCuentaContableIngreso}>Cuenta asignada ({comision.idCuentaContableIngreso})</option>}
            {validas.map(c => <option key={c.idCuentaContable} value={c.idCuentaContable}>{c.codigoCuenta} · {c.nombreCuenta}</option>)}
          </select>
        </label>
        {!accesoPlan && <p className="text-sm text-muted-foreground">Cambiar la cuenta requiere acceso al plan contable.</p>}
        {cuentas.isFetching && <Cargando texto="Consultando cuentas…" />}
        {accesoPlan && cuentas.isError && <ErrorApi error={cuentas.error} reintentar={() => void cuentas.refetch()} />}
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
    {solicitud > 0 && <Aviso>
      <p>Solicitud {solicitud} · {detalleSolicitud.data?.estado ?? 'Recibida para aprobación'}</p>
      <Link className="underline" to={`/aprobaciones/${solicitud}`}>Consultar estado en Aprobaciones</Link>
    </Aviso>}
  </div>
}
