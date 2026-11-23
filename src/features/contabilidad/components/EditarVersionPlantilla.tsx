import { useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { consultarAuxiliares, crearVersion, opcionesLinea, prepararLineas, simularPlantilla, type LineaPlantilla, type PlantillaDetallada } from '@/features/contabilidad/api/plantillas.api'
import { ErrorPlantilla } from '@/features/contabilidad/components/ErrorPlantilla'
import { claseSelectorPlantilla, etiquetaPlantilla, traducirErrorPlantilla, validarLineasPlantilla } from '@/features/contabilidad/lib/plantillas'
import { Aviso, Button, Cargando, Input } from '@/shared/ui'

type DatosVersion = Parameters<typeof crearVersion>[1]
type Auxiliar = Awaited<ReturnType<typeof consultarAuxiliares>>[number]
const lineaNueva: LineaPlantilla = { lado: 'DEBITO', origen: 'FIJA', base: 'PRINCIPAL', cuenta: null, rol: null }

function MensajeCampo({ id, mensaje }: { id: string; mensaje?: string }) {
  return mensaje && <p id={id} role="alert" className="text-sm text-destructive">{mensaje}</p>
}

function SelectorCuenta({ cuentas, nombre, valor, cambiar, error }: {
  cuentas: Auxiliar[]; nombre: string; valor?: number | null; cambiar?: (valor: number | null) => void; error?: string
}) {
  return <select className={claseSelectorPlantilla} name={nombre}
    aria-invalid={Boolean(error)} aria-describedby={error ? `error-${nombre}` : undefined}
    value={cambiar ? valor ?? '' : undefined} defaultValue={cambiar ? undefined : ''}
    onChange={cambiar && ((evento) => cambiar(Number(evento.target.value) || null))}>
    <option value="">Selecciona una cuenta</option>
    {cuentas.map(cuenta => <option key={cuenta.idCuentaContable} value={cuenta.idCuentaContable}>{cuenta.codigoCuenta} · {cuenta.nombreCuenta}</option>)}
  </select>
}

export function EditarVersionPlantilla({ plantilla, fecha, alGuardar, cerrar }: {
  plantilla: PlantillaDetallada; fecha?: string; alGuardar: (id: number) => void; cerrar: () => void
}) {
  const auxiliares = useQuery({ queryKey: ['contabilidad', 'plantillas', 'auxiliares'], queryFn: ({ signal }) => consultarAuxiliares(signal), retry: false })
  const cuentas = auxiliares.data ?? []
  const [lineas, setLineas] = useState(() => prepararLineas(plantilla))
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [confirmar, setConfirmar] = useState<DatosVersion | null>(null)
  const version = useMutation({ mutationFn: (datos: DatosVersion) => crearVersion(plantilla.IdTipoAsiento, datos), retry: false,
    onSuccess: ({ idPlantillaAsiento }) => alGuardar(idPlantillaAsiento) })
  const simulacion = useMutation({ mutationFn: simularPlantilla, retry: false })
  const ocupado = version.isPending || simulacion.isPending
  const errorEnvio = version.isError ? traducirErrorPlantilla(version.error) : null
  const estadoIncierto = errorEnvio && (errorEnvio.status === null || errorEnvio.status >= 500)
  const bases = [...new Set(lineas.map(linea => linea.base))]
  const roles = (origen: LineaPlantilla['origen']) => [...new Set(lineas.filter(l => l.origen === origen).flatMap(l => l.rol?.trim() ? [l.rol.trim()] : []))]
  const producto = roles('PRODUCTO')
  const contra = roles('CONTRAPRODUCTO')
  const comision = lineas.some(l => l.origen === 'COMISION')
  const fijo = lineas.some(l => l.origen === 'FIJA')

  function actualizar(nuevas: LineaPlantilla[]) {
    simulacion.reset()
    setErrores({})
    setLineas(nuevas)
  }

  function cambiar(i: number, cambios: Partial<LineaPlantilla>) {
    actualizar(lineas.map((linea, indice) => indice === i ? { ...linea, ...cambios } : linea))
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (ocupado || confirmar) return
    const datos = new FormData(evento.currentTarget)
    const ids = new Set(cuentas.map(cuenta => cuenta.idCuentaContable))
    const erroresForm = validarLineasPlantilla(lineas, ids)
    const lineasLimpias = lineas.map(l => ({ ...l, rol: l.rol?.trim() || null }))
    const esSimulacion = (evento.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'simular'
    if (!esSimulacion) {
      const nombre = String(datos.get('nombre') ?? '').trim()
      const vigenciaDesde = String(datos.get('vigenciaDesde') ?? '')
      if (!nombre || nombre.length > 100) erroresForm.nombre = 'Ingresa un nombre de hasta 100 caracteres.'
      if (!vigenciaDesde) erroresForm.vigenciaDesde = 'Selecciona el inicio de vigencia.'
      else if (fecha && vigenciaDesde <= fecha) erroresForm.vigenciaDesde = 'Elige una fecha posterior a la fecha contable actual.'
      setErrores(erroresForm)
      if (!Object.keys(erroresForm).length) {
        version.reset()
        setConfirmar({ nombre, vigenciaDesde, lineas: lineasLimpias, codigoPlantilla: plantilla.CodigoPlantilla })
      }
      return
    }
    const monto = (base: string) => {
      const valor = String(datos.get(base) ?? '').trim().replace(',', '.')
      if (!/^\d+(?:\.\d+)?$/.test(valor) || !Number.isFinite(Number(valor))) erroresForm[base] = 'Ingresa un importe mayor o igual a cero.'
      return valor
    }
    const montos = Object.fromEntries(bases.map(base => [base, monto(base)]))
    if (!Object.values(montos).some(valor => Number(valor) > 0)) erroresForm.montos = 'Ingresa al menos un importe mayor que cero.'
    const usaCuenta = (origen: LineaPlantilla['origen'], rol: string | null) =>
      lineasLimpias.some(linea => linea.origen === origen && linea.rol === rol && Number(montos[linea.base]) > 0)
    const cuenta = (nombre: string, requerida: boolean) => {
      const valor = Number(datos.get(nombre))
      if (ids.has(valor)) return valor
      if (requerida) erroresForm[nombre] = 'Selecciona una cuenta auxiliar activa.'
      return null
    }
    const mapa = (lista: string[], prefijo: string, origen: LineaPlantilla['origen']) => Object.fromEntries(lista.flatMap((rol, i) => {
      const id = cuenta(`${prefijo}-${i}`, usaCuenta(origen, rol))
      return id === null ? [] : [[rol, id] as const]
    }))
    const entrada = { lineas: lineasLimpias, montos,
      producto: mapa(producto, 'producto', 'PRODUCTO'), contraproducto: mapa(contra, 'contra', 'CONTRAPRODUCTO'),
      comision: comision ? cuenta('comision', usaCuenta('COMISION', null)) : null }
    setErrores(erroresForm)
    if (!Object.keys(erroresForm).length) simulacion.mutate(entrada)
  }

  function campoCuenta(nombre: string, etiqueta: string) {
    return <div key={etiqueta} className="grid gap-1">
      <label>{etiqueta}<SelectorCuenta nombre={nombre} cuentas={cuentas} error={errores[nombre]} /></label>
      <MensajeCampo id={`error-${nombre}`} mensaje={errores[nombre]} />
    </div>
  }

  return <section aria-label="Nueva versión de la plantilla" className="space-y-4 rounded-2xl border border-border p-4 sm:p-5">
    <h3 className="text-lg font-semibold text-heading">Preparar nueva versión</h3>
    <p className="text-sm text-muted-foreground">La familia {plantilla.CodigoPlantilla} conserva su concepto, origen y tipo de asiento. La nueva versión se enviará a aprobación.</p>
    {auxiliares.isPending && <Cargando texto="Cargando cuentas auxiliares…" />}
    {auxiliares.isError && <ErrorPlantilla error={auxiliares.error} reintentar={() => void auxiliares.refetch()} />}
    {auxiliares.data?.length === 0 && <Aviso>No hay cuentas auxiliares activas disponibles para seleccionar.</Aviso>}
    <form noValidate onSubmit={enviar} onChange={() => simulacion.reset()} className="space-y-4">
      <fieldset disabled={ocupado || Boolean(confirmar)} className="grid min-w-0 gap-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Nombre de la versión<Input name="nombre" maxLength={100} defaultValue={plantilla.Nombre} aria-invalid={Boolean(errores.nombre)} aria-describedby={errores.nombre ? 'error-nombre' : undefined} />
            <MensajeCampo id="error-nombre" mensaje={errores.nombre} /></label>
          <label>Inicio de vigencia<Input name="vigenciaDesde" type="date" aria-invalid={Boolean(errores.vigenciaDesde)} aria-describedby={errores.vigenciaDesde ? 'error-vigencia' : undefined} />
            <MensajeCampo id="error-vigencia" mensaje={errores.vigenciaDesde} /></label>
        </div>
        <fieldset className="grid min-w-0 gap-3">
          <legend className="mb-2 font-semibold text-heading">Movimientos contables</legend>
          <MensajeCampo id="error-lineas" mensaje={errores.lineas} />
          {lineas.map((linea, i) => {
            const nombre = `linea-${i}`
            const error = errores[nombre]
            return <fieldset key={i} className="grid min-w-0 items-start gap-3 rounded-xl border border-border p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.15fr_1fr_2fr_auto]">
              <legend className="px-1 text-sm font-medium">Línea {i + 1}</legend>
              <label>Movimiento<select className={claseSelectorPlantilla} value={linea.lado} onChange={e => cambiar(i, { lado: e.target.value as LineaPlantilla['lado'] })}>{opcionesLinea.lado.map(o => <option key={o} value={o}>{etiquetaPlantilla(o)}</option>)}</select></label>
              <label>Origen de cuenta<select className={claseSelectorPlantilla} value={linea.origen} onChange={e => cambiar(i, { origen: e.target.value as LineaPlantilla['origen'], cuenta: null, rol: null })}>{opcionesLinea.origen.map(o => <option key={o} value={o}>{etiquetaPlantilla(o)}</option>)}</select></label>
              <label>Componente<select className={claseSelectorPlantilla} value={linea.base} onChange={e => cambiar(i, { base: e.target.value as LineaPlantilla['base'] })}>{opcionesLinea.base.map(o => <option key={o} value={o}>{etiquetaPlantilla(o)}</option>)}</select></label>
              <div>
                {linea.origen === 'FIJA' && <label>Cuenta fija<SelectorCuenta cuentas={cuentas} nombre={nombre} valor={linea.cuenta} cambiar={cuenta => cambiar(i, { cuenta })} error={error} /></label>}
                {(linea.origen === 'PRODUCTO' || linea.origen === 'CONTRAPRODUCTO') && <label>Rol contable<Input maxLength={30} value={linea.rol ?? ''} aria-invalid={Boolean(error)} aria-describedby={error ? `error-${nombre}` : undefined} onChange={e => cambiar(i, { rol: e.target.value })} /></label>}
                {linea.origen === 'COMISION' && <p className="text-sm text-muted-foreground">Cuenta resuelta por el motor</p>}
                <MensajeCampo id={`error-${nombre}`} mensaje={error} />
              </div>
              <Button type="button" variant="outline" className="self-end" disabled={lineas.length <= 2} onClick={() => actualizar(lineas.filter((_, indice) => indice !== i))}>Quitar línea</Button>
            </fieldset>
          })}
          <Button type="button" variant="outline" className="w-fit" disabled={lineas.length >= 100} onClick={() => actualizar([...lineas, lineaNueva])}>Añadir línea</Button>
        </fieldset>
        <details className="rounded-xl border border-border p-4">
          <summary className="cursor-pointer font-semibold">Simular movimientos</summary>
          <MensajeCampo id="error-montos" mensaje={errores.montos} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {bases.map(base => <div key={base} className="grid gap-1"><label>Importe de {etiquetaPlantilla(base).toLowerCase()}
              <Input name={base} inputMode="decimal" defaultValue="0" aria-invalid={Boolean(errores[base])} aria-describedby={errores[base] ? `error-${base}` : undefined} /></label>
              <MensajeCampo id={`error-${base}`} mensaje={errores[base]} /></div>)}
            {producto.map((rol, i) => campoCuenta(`producto-${i}`, `Cuenta del producto · ${rol}`))}
            {contra.map((rol, i) => campoCuenta(`contra-${i}`, `Cuenta del contraproducto · ${rol}`))}
            {comision && campoCuenta('comision', 'Cuenta de comisión')}
          </div>
          <Button type="submit" variant="outline" value="simular" className="mt-3" disabled={(fijo || producto.length > 0 || contra.length > 0 || comision) && !auxiliares.data}>Simular</Button>
          {simulacion.isPending && <Cargando texto="Simulando movimientos…" />}
          {simulacion.data && <div className="mt-3"><Aviso><p>Total de débitos: {simulacion.data.total}</p><ul>{simulacion.data.lineas.map((linea, i) => {
            const cuenta = cuentas.find(c => c.idCuentaContable === linea.cuenta)
            return <li key={i}>{etiquetaPlantilla(linea.lado)} · {cuenta ? `${cuenta.codigoCuenta} ${cuenta.nombreCuenta}` : 'Cuenta resuelta'} · {linea.monto}</li>
          })}</ul></Aviso></div>}
        </details>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={cerrar}>Cancelar edición</Button>
          <Button type="submit" value="guardar" disabled={fijo && !auxiliares.data}>Revisar propuesta</Button>
        </div>
      </fieldset>
      {simulacion.isError && <ErrorPlantilla error={simulacion.error} />}
      {confirmar && <div className="grid gap-3 rounded-xl border border-border bg-field p-4">
        <h4 className="font-semibold">Confirmar envío a aprobación</h4>
        <p>{confirmar.nombre} · Inicio {confirmar.vigenciaDesde} · {confirmar.lineas.length} líneas. La versión quedará pendiente de aprobación.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={ocupado} onClick={() => setConfirmar(null)}>Volver a editar</Button>
          <Button type="button" disabled={ocupado || Boolean(estadoIncierto)} onClick={() => version.mutate(confirmar)}>{version.isPending ? 'Enviando…' : 'Confirmar y enviar'}</Button>
        </div>
        {estadoIncierto && <Aviso>Consulta el historial de la familia para comprobar si la versión se registró antes de intentar otro envío.</Aviso>}
      </div>}
      {version.isError && <ErrorPlantilla error={version.error} />}
    </form>
  </section>
}
