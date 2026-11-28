import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usePuedeFuncion, useAuthStore, usePermisos } from '@/features/auth'
import { AvisoRequiereAprobacion, Badge, Button } from '@/shared/ui'
import { habilitacionKey } from '@/features/clientes/api/habilitacion'
import {
  accesoRiesgo,
  fechaRiesgoVisible,
  formatearFechaVigencia,
  listarRiesgos,
  registrarEvaluacion,
  riesgoKey,
  validezEvaluacion,
  type RiesgoCreate,
} from '@/features/clientes/api/riesgo'
import { EvaluacionRiesgoForm } from '@/features/clientes/components/EvaluacionRiesgoForm'
import { DialogoFicha } from '@/features/clientes/components/DialogoFicha'

export function GestionRiesgo({
  id,
  nombre,
  estado,
  mostrarHistorialInicial = false,
}: {
  id: number
  nombre: string
  estado?: string
  mostrarHistorialInicial?: boolean
}) {
  const roles = useAuthStore((store) => store.user?.roles)
  const anterior = accesoRiesgo(roles ?? [], usePermisos())
  const acceso = { registro: usePuedeFuncion('clientes.riesgo.evaluar', anterior.registro), historial: usePuedeFuncion('clientes.riesgo.consultar', anterior.historial) }
  const cache = useQueryClient()
  const [vista, setVista] = useState<'evaluacion' | 'historial' | null>(mostrarHistorialInicial ? 'historial' : null)
  const disparador = useRef<HTMLButtonElement>(null)
  const [aviso, setAviso] = useState('')
  const [solicitud, setSolicitud] = useState<number | null>(null)
  const consulta = useQuery({ queryKey: riesgoKey(id), queryFn: ({ signal }) => listarRiesgos(id, signal), enabled: acceso.historial, retry: false })

  const mutacion = useMutation({
    mutationFn: (entrada: RiesgoCreate) => registrarEvaluacion(id, entrada),
    retry: false,
    onSuccess: async (resultado) => {
      if (resultado.tipo === 'solicitud') {
        setVista(null)
        setAviso('')
        setSolicitud(resultado.idSolicitud)
      } else {
        setSolicitud(null)
        setVista('historial')
        setAviso(`Evaluación #${resultado.evaluacion.idEvaluacion} registrada. Estado del cliente confirmado por el servidor: ${resultado.evaluacion.estadoCliente}.`)
        await Promise.allSettled([
          cache.invalidateQueries({ queryKey: riesgoKey(id) }),
          cache.invalidateQueries({ queryKey: ['clientes', 'detalle', id] }),
          cache.invalidateQueries({ queryKey: habilitacionKey(id) }),
          cache.invalidateQueries({ queryKey: ['clientes', 'busqueda'] }),
          cache.invalidateQueries({ queryKey: ['clientes', 'historial', id] }),
          cache.invalidateQueries({ queryKey: ['clientes', 'perfil', id] }),
        ])
      }
    },
  })
  if (!acceso.historial) return null
  const vigente = consulta.data?.find((fila) => fila.esVigente)
  const validez = vigente ? validezEvaluacion(vigente.vigenteHasta) : null
  const puedeEvaluar = acceso.registro && estado !== 'Eliminado'
  const cerrar = () => {
    setVista(null)
    mutacion.reset()
  }

  return (
    <section aria-labelledby="riesgo-titulo" className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 id="riesgo-titulo" className="text-lg font-semibold text-heading">Evaluación de riesgo</h2><p className="mt-1 text-sm text-muted-foreground">LAFT, exposición política y antecedentes del cliente.</p></div>
        {puedeEvaluar && (
          <Button type="button" onClick={evento => {
            disparador.current = evento.currentTarget
            mutacion.reset()
            setAviso('')
            setSolicitud(null)
            setVista('evaluacion')
          }}>
            Nueva evaluación
          </Button>
        )}
      </header>
      <p className="text-sm text-muted-foreground">LAFT evalúa el riesgo de lavado de activos y financiamiento del terrorismo. PEP identifica a personas expuestas políticamente. El personal autorizado registra el análisis y su resultado.</p>
      {aviso && <p role="status" className="rounded-xl border border-border bg-muted p-4 text-sm text-heading">{aviso}</p>}
      {solicitud !== null && <AvisoRequiereAprobacion idSolicitud={solicitud} />}
      {consulta.isPending && <p role="status" className="text-sm text-muted-foreground">Cargando evaluaciones…</p>}
      {consulta.isError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 p-4 text-sm"><p className="flex-1 text-destructive">{consulta.error.message}</p><Button type="button" variant="outline" disabled={consulta.isFetching} onClick={() => void consulta.refetch()}>Reintentar historial</Button></div>}
      {consulta.isSuccess && <div className="flex flex-wrap items-center gap-3 text-sm">
        {vigente ? (
          <>
            <Badge>{vigente.resultadoEvaluacion}</Badge>
            <span>Riesgo LAFT {vigente.nivelRiesgoLAFT}</span>
            <span>PEP {vigente.esPEP ? 'Sí' : 'No'}</span>
            <span>Antecedentes {vigente.tieneAntecedentes ? 'Sí' : 'No'}</span>
            {validez && <span>{validez}</span>}
          </>
        ) : (
          <p className="text-muted-foreground">El cliente carece de una evaluación vigente.</p>
        )}
      </div>}
      {consulta.isSuccess && (
        <Button type="button" variant="outline" className="self-start" onClick={evento => {
          disparador.current = evento.currentTarget
          setVista('historial')
        }}>
          Ver historial de riesgo ({consulta.data.length})
        </Button>
      )}
      {(vista === 'historial' || (vista === 'evaluacion' && puedeEvaluar)) && (
        <DialogoFicha titulo={vista === 'evaluacion' ? 'Nueva evaluación de riesgo' : 'Historial de riesgo'}
          descripcion={nombre} disparador={disparador} cerrar={cerrar} ocupado={vista === 'evaluacion' && mutacion.isPending}>
          {vista === 'evaluacion' && <EvaluacionRiesgoForm
            key={id}
            nombre={nombre}
            ocupado={mutacion.isPending}
            error={mutacion.error}
            guardar={async (entrada) => {
              setAviso('')
              setSolicitud(null)
              await mutacion.mutateAsync(entrada)
            }}
            cancelar={cerrar}
          />}
          {vista === 'historial' && consulta.isSuccess && <div className="flex flex-col gap-3">
            {consulta.data.length === 0 && <p className="text-sm text-muted-foreground">Todavía no se han registrado evaluaciones.</p>}
            {consulta.data.map((fila) => <article key={fila.idEvaluacion} className="rounded-xl border border-border bg-field p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-heading">Evaluación #{fila.idEvaluacion} · {fila.resultadoEvaluacion}</h3><Badge variant={fila.esVigente ? 'default' : 'outline'}>{fila.esVigente ? 'Vigente' : 'Histórica'}</Badge></div>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Fecha registrada</dt><dd>{fechaRiesgoVisible(fila.fechaEvaluacion)}</dd></div>
                <div><dt className="text-muted-foreground">Evaluador</dt><dd>Usuario interno #{fila.evaluador}</dd></div>
                <div><dt className="text-muted-foreground">Riesgo LAFT</dt><dd>{fila.nivelRiesgoLAFT}</dd></div>
                <div><dt className="text-muted-foreground">PEP</dt><dd>{fila.esPEP ? 'Sí' : 'No'}</dd></div>
                <div><dt className="text-muted-foreground">Antecedentes</dt><dd>{fila.tieneAntecedentes ? `Sí · Tipo #${fila.idTipoAntecedente}` : 'No'}</dd></div>
                <div><dt className="text-muted-foreground">Vigente hasta</dt><dd>{formatearFechaVigencia(fila.vigenteHasta)}</dd></div>
                {fila.idSolicitud != null && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">Aprobación</dt>
                    <dd>
                      <Link className="font-medium text-link underline" to={`/aprobaciones/${fila.idSolicitud}`}>
                        Aprobada en la solicitud #{fila.idSolicitud}
                      </Link>
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2"><dt className="text-muted-foreground">Observaciones</dt><dd className="whitespace-pre-wrap break-words">{fila.observaciones || 'Sin observaciones registradas.'}</dd></div>
              </dl>
            </article>)}
          </div>}
        </DialogoFicha>
      )}
    </section>
  )
}
