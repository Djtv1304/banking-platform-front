import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutList, RotateCcw, Save } from 'lucide-react'

import { formatRol, hasAnyRole, useAuthStore } from '@/features/auth'
import { useConfiguracionAccesos, useGuardarConfiguracionAccesos } from '@/features/seguridad/hooks/useConfiguracionAccesos'
import { exigeReconsulta } from '@/features/seguridad/api/accesos.api'
import { errorMotivoAcceso } from '@/features/seguridad/lib/motivo-acceso'
import { ROLES_CONSULTA_ROLES } from '@/features/seguridad/lib/acceso'
import type { PestanaRoles } from '@/features/seguridad/api/seguridad.contract'
import { Aviso, Badge, Button, Cargando, Checkbox } from '@/shared/ui'

export interface PestanaEditable {
  to: string
  label: string
  seccion: string
  rolesPorDefecto: readonly string[]
  requiereAccion: boolean
}

interface PestanasRolPageProps {
  pestanas: readonly PestanaEditable[]
  roles: readonly string[]
}

type Seleccion = Record<string, readonly string[]>

const igual = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((r) => b.includes(r))

/** La configuración SQL se comparte con menú, rutas y APIs cuando se activa la política. */
export function PestanasRolPage({ pestanas, roles }: PestanasRolPageProps) {
  const actuales = useAuthStore((state) => state.user?.roles)
  const esAdmin = hasAnyRole(actuales ?? [], ROLES_CONSULTA_ROLES)
  const guardadas = useConfiguracionAccesos(esAdmin)
  const guardar = useGuardarConfiguracionAccesos()
  const [edicion, setEdicion] = useState<Seleccion | null>(null)
  const [motivo, setMotivo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [incierto, setIncierto] = useState(false)
  const enviando = useRef(false)
  const versionBorrador = useRef<string | null>(null)

  const base = useMemo<Seleccion>(() => {
    const configuradas = new Map((guardadas.data?.pestanas ?? []).map((p) => [p.pestana, p.roles]))
    return Object.fromEntries(pestanas.map((p) => [p.to, configuradas.get(p.to) ?? guardadas.data?.secciones.find((s) => s.ruta === p.to)?.roles ?? p.rolesPorDefecto]))
  }, [guardadas.data, pestanas])

  useEffect(() => {
    if (!edicion && !motivo) return
    const advertir = (evento: BeforeUnloadEvent) => { evento.preventDefault(); evento.returnValue = '' }
    window.addEventListener('beforeunload', advertir)
    return () => window.removeEventListener('beforeunload', advertir)
  }, [edicion, motivo])

  if (!esAdmin) return <Aviso tono="error">Solo un administrador puede configurar las pestañas por rol.</Aviso>

  const seleccion = edicion ?? base
  const pendientes = pestanas.filter((p) => !igual(seleccion[p.to] ?? [], base[p.to] ?? [])).length
  const cambiado = pendientes > 0
  const errorMotivo = errorMotivoAcceso(motivo)
  const ocupado = guardar.isPending || guardadas.isFetching

  function compatible(to: string, rol: string) {
    const seccion = guardadas.data?.secciones.find((s) => s.ruta === to)
    return seccion ? seccion.roles.includes(rol) : to === '/creditos'
  }

  function iniciarEdicion() {
    versionBorrador.current ??= guardadas.data?.version ?? null
    setMensaje('')
  }

  function alternar(to: string, rol: string, ver: boolean) {
    iniciarEdicion()
    const actual = seleccion[to] ?? []
    setEdicion({ ...seleccion, [to]: ver ? [...actual, rol] : actual.filter((r) => r !== rol) })
  }

  /** Grupo de módulos (sección del menú): marca o desmarca todas sus pestañas para ese rol */
  function alternarGrupo(seccion: string, rol: string, ver: boolean) {
    iniciarEdicion()
    const nueva = { ...seleccion }
    for (const p of pestanas.filter((x) => x.seccion === seccion)) {
      const actual = nueva[p.to] ?? []
      nueva[p.to] = ver && compatible(p.to, rol) ? [...new Set([...actual, rol])] : actual.filter((r) => r !== rol)
    }
    setEdicion(nueva)
  }

  function estadoGrupo(seccion: string, rol: string): boolean | 'indeterminate' {
    const delGrupo = pestanas.filter((p) => p.seccion === seccion)
    const marcadas = delGrupo.filter((p) => (seleccion[p.to] ?? []).includes(rol)).length
    if (marcadas === 0) return false
    return marcadas === delGrupo.length ? true : 'indeterminate'
  }

  function enviar(nueva: Seleccion) {
    if (enviando.current || ocupado || incierto || errorMotivo || !guardadas.data) return
    // Solo se guardan las que difieren del menú por defecto
    const cuerpo: PestanaRoles[] = pestanas
      .filter((p) => !igual(nueva[p.to] ?? [], guardadas.data?.secciones.find((s) => s.ruta === p.to)?.roles ?? p.rolesPorDefecto))
      .map((p) => ({ pestana: p.to, roles: roles.filter((r) => (nueva[p.to] ?? []).includes(r)) }))
    const conservadas = guardadas.data.pestanas.filter((p) => !pestanas.some((vista) => vista.to === p.pestana))
    enviando.current = true
    setError('')
    guardar.mutate({ pestanas: [...conservadas, ...cuerpo], motivo: motivo.trim(), version: versionBorrador.current ?? guardadas.data.version }, {
      onSuccess: (resultado) => {
        setEdicion(null)
        setMotivo('')
        versionBorrador.current = null
        setMensaje(resultado.activa
          ? 'Accesos guardados. El control por sección está activo en este backend. Las otras sesiones deben actualizar sus accesos.'
          : 'Accesos guardados. El control por sección está desactivado en este backend; continúan las reglas anteriores hasta activarlo.')
      },
      onError: (fallo) => { setError(fallo.message); setIncierto(exigeReconsulta(fallo)) },
      onSettled: () => { enviando.current = false },
    })
  }

  async function consultarEstado() {
    if ((edicion || motivo) && !window.confirm('Se consultará la configuración actual y se descartará el borrador. ¿Continuar?')) return
    const resultado = await guardadas.refetch()
    if (resultado.isSuccess) {
      setEdicion(null); setMotivo(''); setError(''); setIncierto(false)
      versionBorrador.current = null
      setMensaje('Configuración consultada. Revisa los accesos antes de preparar otro cambio.')
    }
  }

  const secciones = [...new Set(pestanas.map((p) => p.seccion))]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight font-bold tracking-tight text-heading sm:text-[40px]">Pestañas por rol</h1>
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            Elige qué grupos de módulos y qué pestañas ve cada rol. La casilla del grupo marca o desmarca todas sus pestañas; un grupo sin pestañas visibles desaparece del menú.
          </p>
        </div>
        <Badge variant="secondary" className="h-7 gap-1.5 px-3 text-sm">
          <LayoutList aria-hidden className="size-4" />
          {pestanas.length} pestañas
        </Badge>
      </header>

      <Aviso>
        Al activar el control por sección, esta configuración restringe menú, rutas y APIs. No concede permisos operativos ni acceso a otras agencias. Las casillas incompatibles no se pueden habilitar. Créditos sigue en preparación.
      </Aviso>

      {guardadas.error && (
        <Aviso tono="error">No pudimos leer la configuración guardada. Conservamos el borrador. {guardadas.error.message}<Button variant="outline" onClick={() => void consultarEstado()}>Reintentar consulta</Button></Aviso>
      )}
      {mensaje && <Aviso>{mensaje}</Aviso>}
      {guardadas.data && <Aviso>Control por sección: {guardadas.data.activa ? 'activo' : 'desactivado'}. Guardar no modifica su activación.</Aviso>}
      {guardadas.isPending ? (
        <Cargando texto="Cargando configuración…" />
      ) : guardadas.data ? (
        <section aria-labelledby="matriz-pestanas" className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-6">
          <h2 id="matriz-pestanas" className="sr-only">Pestañas y roles</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th scope="col" className="py-2 pr-4 font-medium">Pestaña</th>
                  {roles.map((rol) => (
                    <th key={rol} scope="col" className="px-2 py-2 text-center font-medium">
                      {formatRol(rol)}
                    </th>
                  ))}
                </tr>
              </thead>
              {secciones.map((seccion) => (
                <tbody key={seccion}>
                  <tr className="bg-muted/40">
                    <th scope="rowgroup" className="py-2.5 pr-4 pl-2 text-left text-xs font-semibold tracking-wide text-heading uppercase">
                      {seccion}
                    </th>
                    {roles.map((rol) => (
                      <td key={rol} className="px-2 py-2.5 text-center">
                        <Checkbox
                          aria-label={`Grupo ${seccion}: ${formatRol(rol)}`}
                          checked={estadoGrupo(seccion, rol)}
                          disabled={ocupado || incierto}
                          onCheckedChange={(valor) => alternarGrupo(seccion, rol, valor === true)}
                          className="mx-auto"
                        />
                      </td>
                    ))}
                  </tr>
                  {pestanas.filter((p) => p.seccion === seccion).map((p) => (
                    <tr key={p.to} className="border-b border-border/60">
                      <th scope="row" className="py-2.5 pr-4 text-left font-normal text-heading">
                        <span className="flex flex-wrap items-center gap-2">
                          {p.label}
                          {p.requiereAccion && <Badge variant="secondary">Requiere acción</Badge>}
                          {!igual(seleccion[p.to] ?? [], guardadas.data?.secciones.find((s) => s.ruta === p.to)?.roles ?? p.rolesPorDefecto) && <Badge variant="outline">Personalizada</Badge>}
                        </span>
                      </th>
                      {roles.map((rol) => (
                        <td key={rol} className="px-2 py-2.5 text-center">
                          <Checkbox
                            aria-label={`${p.label}: ${formatRol(rol)}`}
                            checked={(seleccion[p.to] ?? []).includes(rol)}
                            disabled={ocupado || incierto || (!compatible(p.to, rol) && !(seleccion[p.to] ?? []).includes(rol))}
                            onCheckedChange={(valor) => alternar(p.to, rol, valor === true)}
                            className="mx-auto"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <label htmlFor="motivo-accesos" className="text-sm font-medium">Motivo del cambio</label>
            <textarea id="motivo-accesos" rows={3} maxLength={160} value={motivo} disabled={ocupado || incierto}
              onChange={(evento) => { iniciarEdicion(); setMotivo(evento.target.value) }}
              aria-invalid={Boolean((cambiado || motivo) && errorMotivo)} aria-describedby="ayuda-motivo"
              className="rounded-xl border border-border bg-field px-3 py-2 text-heading" />
            <p id="ayuda-motivo" role="status" className="text-sm text-muted-foreground">{(cambiado || motivo) && errorMotivo ? errorMotivo : 'Entre 10 y 160 caracteres, en una sola línea. Se registra en auditoría.'}</p>
          </div>
          <p role="status" className="mt-4 text-sm text-muted-foreground">{pendientes} {pendientes === 1 ? 'sección con cambios pendientes' : 'secciones con cambios pendientes'}.</p>
          {error && <div className="mt-4"><Aviso tono="error">{error}{incierto && ' Consulta el estado actual antes de volver a guardar.'}</Aviso></div>}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-xl"
              disabled={ocupado || incierto}
              onClick={() => {
                iniciarEdicion()
                setEdicion(Object.fromEntries(pestanas.map((p) => [p.to, guardadas.data?.secciones.find((s) => s.ruta === p.to)?.roles ?? p.rolesPorDefecto])))
              }}
            >
              <RotateCcw aria-hidden />
              Restablecer menú por defecto
            </Button>
            <Button type="button" variant="outline" disabled={ocupado} onClick={() => void consultarEstado()}>Consultar estado actual</Button>
            <Button type="button" className="min-h-11 rounded-xl" disabled={!cambiado || ocupado || incierto || errorMotivo !== null} onClick={() => enviar(seleccion)}>
              <Save aria-hidden />
              {guardar.isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
