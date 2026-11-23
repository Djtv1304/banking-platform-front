import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

import {
  aplicarImportacion, consultarImportacion, prepararImportacion, MAX_BYTES_CSV, MAX_ID_IMPORTACION,
  type ImportacionCatalogo,
} from '@/features/contabilidad/api/importacion-catalogo.api'
import { RevisionCatalogo } from '@/features/contabilidad/components/RevisionCatalogo'
import { opcionesPlanCuentas } from '@/features/contabilidad/hooks/usePlanCuentas'
import { usePermisosImportacion } from '@/features/contabilidad/hooks/usePermisosImportacion'
import { toApiError, type ApiError } from '@/shared/api'
import { Aviso, Button, Cargando, Input, Label } from '@/shared/ui'

type Operacion = { tipo: 'preparar'; archivo: File } | { tipo: 'consultar' | 'aplicar'; id: number }
const pasos = ['Cargar', 'Revisar', 'Confirmar', 'Resultado'] as const
type Paso = (typeof pasos)[number]

function validarArchivo(archivo: File): string | null {
  if (!/\.csv$/i.test(archivo.name) || [...archivo.name].length > 200) {
    return 'Selecciona un archivo con extensión .csv y un nombre de hasta 200 caracteres.'
  }
  if (/[^\x20-\x7e\xa0-\xff]/.test(archivo.name)) {
    return 'Usa un nombre sencillo, por ejemplo, catalogo-seps.csv. Conserva el contenido del archivo.'
  }
  if (archivo.size === 0) return 'El archivo está vacío. Incluye la cabecera y al menos una cuenta.'
  if (archivo.size > MAX_BYTES_CSV) return 'El archivo supera el tamaño máximo de 2 MiB.'
  return null
}

function mensajeError(error: ApiError) {
  if (error.status === 401) return 'Tu sesión ya no está activa. Inicia sesión para continuar.'
  if (error.status === 403) return 'No tienes autorización para esta operación.'
  if (error.status === 404) return 'No encontramos una importación tuya con ese número.'
  switch (error.code) {
    case 'ARCHIVO_INVALIDO':
      return 'No pudimos validar el CSV. Verifica la codificación UTF-8, la cabecera, las columnas y los límites de tamaño y registros.'
    case 'CATALOGO_CAMBIO':
      return 'El plan de cuentas cambió después de la revisión. Carga el archivo y revísalo nuevamente antes de aplicar.'
    case 'IMPORTACION_CON_ERRORES':
      return 'La revisión contiene errores bloqueantes. Corrige el CSV y vuelve a cargarlo para revisarlo.'
    case 'LIMITE_IMPORTACION_INVALIDO':
    case 'TIPO_PARAMETRO_INVALIDO':
    case 'VALOR_FUERA_DE_RANGO':
    case 'VALOR_NO_PERMITIDO':
      return 'El límite de registros está temporalmente fuera de servicio. Contacta con soporte.'
    default:
      return error.message
  }
}

function Auditoria({ importacion }: { importacion: ImportacionCatalogo }) {
  const fecha = importacion.FechaAplicada
  const instante = fecha && new Date(`${fecha}Z`) // El contrato serializa UTC sin sufijo.
  return (
    <Aviso>
      <strong>Importación aplicada</strong>
      <p>Cuentas creadas: {importacion.FilasNuevas}. Cuentas modificadas: {importacion.FilasCambiadas}. Cuentas sin cambios: {importacion.FilasIguales}.</p>
      {importacion.AplicadoPor !== null && <p>Identificador interno del usuario: {importacion.AplicadoPor}</p>}
      {instante && Number.isFinite(instante.getTime()) && (
        <p>Fecha de aplicación: {instante.toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}</p>
      )}
    </Aviso>
  )
}

export function ImportarCatalogoPage() {
  const permisos = usePermisosImportacion()
  const cliente = useQueryClient()
  const [paso, setPaso] = useState<Paso>('Cargar')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [numero, setNumero] = useState('')
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [importacion, setImportacion] = useState<ImportacionCatalogo | null>(null)
  const [obsoletas, setObsoletas] = useState<ReadonlySet<number>>(() => new Set())
  const enCurso = useRef(false)
  const tituloPaso = useRef<HTMLHeadingElement>(null)
  useEffect(() => { tituloPaso.current?.focus() }, [paso])

  const mutacion = useMutation({
    retry: false,
    mutationFn: (operacion: Operacion) => {
      if (operacion.tipo === 'preparar') return prepararImportacion(operacion.archivo)
      if (operacion.tipo === 'consultar') return consultarImportacion(operacion.id)
      return aplicarImportacion(operacion.id)
    },
    onSuccess: async (datos) => {
      setImportacion(datos)
      setNumero(String(datos.IdImportacion))
      if (datos.estado === 'Aplicada') {
        await cliente.invalidateQueries({ queryKey: opcionesPlanCuentas.queryKey, refetchType: 'none' })
        await cliente.prefetchQuery(opcionesPlanCuentas)
      }
      setPaso(datos.estado === 'Aplicada' ? 'Resultado' : 'Revisar')
    },
    onError: (error, operacion) => {
      if (operacion.tipo !== 'aplicar') return
      const apiError = toApiError(error)
      if (apiError.code === 'CATALOGO_CAMBIO') {
        setObsoletas((previas) => new Set(previas).add(operacion.id))
      }
      setPaso('Resultado')
    },
    onSettled: () => { enCurso.current = false },
  })

  const error = mutacion.isError ? toApiError(mutacion.error) : null
  const obsoleta = importacion !== null && obsoletas.has(importacion.IdImportacion)
  const bloqueada = importacion !== null && (importacion.FilasError > 0 || importacion.revision.some((fila) => fila.resultado === 'Error'))
  const puedeAplicar = permisos.aplicar && importacion?.estado === 'Revision' && !bloqueada && !obsoleta
  const permiteReintentar = puedeAplicar && error && ![401, 403, 404].includes(error.status ?? 0) && error.code !== 'IMPORTACION_CON_ERRORES'
  const ocupado = mutacion.isPending
  const mensajesCarga = { preparar: 'Cargando y revisando el archivo…', consultar: 'Consultando la importación…', aplicar: 'Aplicando la importación y actualizando el plan…' }

  const ejecutar = (operacion: Operacion) => {
    if (enCurso.current) return
    enCurso.current = true
    setErrorLocal(null)
    mutacion.mutate(operacion)
  }

  const cargar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!permisos.preparar || !archivo) return
    const mensaje = validarArchivo(archivo)
    if (mensaje) { setErrorLocal(mensaje); return }
    ejecutar({ tipo: 'preparar', archivo })
  }

  const consultar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    if (!permisos.consultar) return
    const id = Number(numero)
    if (!/^\d+$/.test(numero.trim()) || !Number.isInteger(id) || id < 1 || id > MAX_ID_IMPORTACION) {
      setErrorLocal('Ingresa un número de importación válido, entre 1 y 2.147.483.647.')
      return
    }
    ejecutar({ tipo: 'consultar', id })
  }

  const volverACargar = () => {
    if (enCurso.current) return
    mutacion.reset()
    setArchivo(null)
    setErrorLocal(null)
    setPaso('Cargar')
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6">
      <Button asChild variant="ghost" className="w-fit text-muted-foreground">
        <Link to="/contabilidad"><ArrowLeft aria-hidden />Volver al plan de cuentas</Link>
      </Button>
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-heading sm:text-[40px]">Importar catálogo</h1>
        <p className="mt-2 text-muted-foreground">Revisa los cambios del catálogo regulatorio antes de actualizar el plan de cuentas.</p>
      </header>

      {!permisos.preparar && !permisos.consultar ? <Aviso tono="error">No tienes permiso para cargar ni consultar importaciones.</Aviso> : (
        <>
          <ol aria-label="Pasos de importación" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pasos.map((nombre, indice) => (
              <li key={nombre} aria-current={nombre === paso ? 'step' : undefined}
                className="rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground aria-[current=step]:border-primary aria-[current=step]:font-semibold aria-[current=step]:text-heading">
                {indice + 1}. {nombre}
              </li>
            ))}
          </ol>
          <section aria-labelledby="paso-importacion" className="grid min-w-0 gap-4 rounded-3xl border border-border bg-card p-4 sm:p-6">
            <h2 id="paso-importacion" ref={tituloPaso} tabIndex={-1} className="text-xl font-semibold text-heading">
              {{ Cargar: 'Cargar archivo', Revisar: 'Revisar cambios', Confirmar: 'Confirmar aplicación', Resultado: 'Resultado' }[paso]}
            </h2>
            {errorLocal && <Aviso tono="error">{errorLocal}</Aviso>}
            {error && !errorLocal && (
              <Aviso tono="error">
                {mensajeError(error)}
                {error.fields.map(({ field, message }) => <p key={`${field}-${message}`}>{message}</p>)}
              </Aviso>
            )}
            {ocupado && mutacion.variables && <Cargando texto={mensajesCarga[mutacion.variables.tipo]} />}

            {paso === 'Cargar' && (
              <>
                {permisos.preparar && (
                  <form onSubmit={cargar} className="grid gap-3 rounded-xl border border-dashed border-border p-4">
                    <Label htmlFor="catalogo-regulador-csv">Archivo CSV</Label>
                    <Input id="catalogo-regulador-csv" type="file" accept=".csv,text/csv" disabled={ocupado}
                      aria-describedby="requisitos-catalogo"
                      onChange={(evento) => {
                        setArchivo(evento.target.files?.[0] ?? null)
                        setErrorLocal(null)
                        mutacion.reset()
                      }}
                    />
                    <div id="requisitos-catalogo" className="grid gap-1 text-sm text-muted-foreground">
                      <p>Usa UTF-8, con BOM opcional. Máximo 2 MiB y 5.000 registros. La configuración vigente puede reducir el límite de registros.</p>
                      <p>Incluye al menos una cuenta y utiliza esta cabecera en el mismo orden.</p>
                      <code className="break-all">CodigoCuenta,NombreCuenta,CodigoCuentaSuperior,Naturaleza</code>
                      <p>Conserva los códigos como texto, deja vacía la cuenta superior de las raíces y usa DEUDORA o ACREEDORA.</p>
                    </div>
                    <Button type="submit" disabled={!archivo || ocupado} className="w-fit">Cargar y revisar CSV</Button>
                  </form>
                )}
                {permisos.consultar && (
                  <form onSubmit={consultar} className="grid gap-2 border-t border-border pt-4">
                    <Label htmlFor="numero-importacion">Número de importación</Label>
                    <p className="text-sm text-muted-foreground" id="ayuda-consulta-importacion">Consulta el estado de un archivo que cargaste anteriormente.</p>
                    <div className="flex flex-wrap gap-2">
                      <Input id="numero-importacion" aria-describedby="ayuda-consulta-importacion" inputMode="numeric" className="w-full sm:w-52"
                        value={numero} disabled={ocupado} onChange={(evento) => { setNumero(evento.target.value); setErrorLocal(null); mutacion.reset() }} />
                      <Button type="submit" variant="outline" disabled={ocupado || !numero.trim()}>Recuperar importación</Button>
                    </div>
                  </form>
                )}
              </>
            )}

            {paso === 'Revisar' && importacion && (
              <>
                <p className="break-all text-sm text-muted-foreground">{importacion.NombreArchivo} · Importación n.º {importacion.IdImportacion}</p>
                {bloqueada && <Aviso tono="error">Corrige en el CSV las filas con errores bloqueantes y vuelve a cargarlo.</Aviso>}
                {obsoleta && <Aviso tono="error">Esta revisión quedó obsoleta. Carga el archivo y revísalo nuevamente.</Aviso>}
                {!permisos.aplicar && <Aviso>Tu acceso permite revisar la carga. Para aplicar se requiere un permiso adicional.</Aviso>}
                <RevisionCatalogo key={importacion.IdImportacion} importacion={importacion} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={volverACargar}>{permisos.preparar ? 'Cargar otro archivo' : 'Volver a la consulta'}</Button>
                  {permisos.aplicar && <Button disabled={!puedeAplicar} onClick={() => setPaso('Confirmar')}>Continuar a confirmación</Button>}
                </div>
              </>
            )}

            {paso === 'Confirmar' && importacion && (
              <>
                <Aviso>
                  <p>Al aplicar se actualizará el plan de cuentas.</p>
                  <p>Cuentas que se crearán: {importacion.FilasNuevas}. Cuentas que se modificarán: {importacion.FilasCambiadas}.</p>
                </Aviso>
                {!permisos.aplicar && <Aviso tono="error">Ya no tienes permiso para aplicar esta importación.</Aviso>}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" disabled={ocupado} onClick={() => setPaso('Revisar')}>Volver a la revisión</Button>
                  <Button disabled={!puedeAplicar || ocupado} onClick={() => {
                    if (puedeAplicar) ejecutar({ tipo: 'aplicar', id: importacion.IdImportacion })
                  }}>Confirmar y aplicar</Button>
                </div>
              </>
            )}

            {paso === 'Resultado' && importacion && (
              <>
                {importacion.estado === 'Aplicada' && <Auditoria importacion={importacion} />}
                <div className="flex flex-wrap gap-2">
                  {importacion.estado === 'Aplicada' && <Button asChild><Link to="/contabilidad">Ver plan actualizado</Link></Button>}
                  <Button variant="outline" disabled={ocupado} onClick={volverACargar}>
                    {permisos.preparar ? 'Cargar otro archivo' : 'Volver a la consulta'}
                  </Button>
                  {importacion.estado === 'Revision' && error?.status === null && permisos.consultar && (
                    <Button disabled={ocupado} onClick={() => ejecutar({ tipo: 'consultar', id: importacion.IdImportacion })}>Consultar estado</Button>
                  )}
                  {permiteReintentar && <Button disabled={ocupado} onClick={() => {
                    mutacion.reset()
                    setPaso('Confirmar')
                  }}>Volver a confirmar</Button>}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
