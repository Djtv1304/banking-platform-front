import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/features/auth'
import { toApiError } from '@/shared/api'
import type { ConfiguracionFunciones, ValorAjuste } from '@/features/seguridad/api/funciones.api'
import { cambiarCelda, cambiosParaGuardar, dependenciasFaltantes, fusionarBorrador, type Borrador, type Conflicto } from '@/features/seguridad/lib/borrador-funciones'
import { errorMotivoAcceso } from '@/features/seguridad/lib/motivo-acceso'
import { useConfiguracionFunciones, useGuardarFunciones } from '@/features/seguridad/hooks/useConfiguracionFunciones'

export function useEditorFunciones(esAdmin: boolean) {
  const actor = useAuthStore((s) => s.user?.idUsuario)
  const consulta = useConfiguracionFunciones(esAdmin)
  const mutacion = useGuardarFunciones()
  const [base, setBase] = useState<ConfiguracionFunciones | null>(() => consulta.data ?? null)
  const [borrador, setBorrador] = useState<Borrador>({})
  const [conflictos, setConflictos] = useState<Conflicto[]>([])
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [incierto, setIncierto] = useState(false)

  useEffect(() => {
    if (!Object.keys(borrador).length && !motivo) return
    const advertir = (evento: BeforeUnloadEvent) => { evento.preventDefault(); evento.returnValue = '' }
    window.addEventListener('beforeunload', advertir)
    return () => window.removeEventListener('beforeunload', advertir)
  }, [borrador, motivo])

  // Ajustar el estado propio al cambiar el snapshot evita un efecto que borre
  // el borrador después de pintar. Ambas ramas convergen en una sola actualización.
  const [actorBase, setActorBase] = useState(actor)
  const enviando = useRef(false)
  if (actor !== actorBase) {
    setActorBase(actor); setBase(consulta.data ?? null); setBorrador({}); setConflictos([])
    setMotivo(''); setError(''); setMensaje(''); setIncierto(false)
  } else if (consulta.data && !mutacion.isPending && consulta.data.version !== base?.version) {
    if (!base) setBase(consulta.data)
    else {
      const fusion = fusionarBorrador(base, consulta.data, borrador)
      setBase(consulta.data); setBorrador(fusion.borrador); setConflictos(fusion.conflictos)
      setMensaje(fusion.conflictos.length
        ? 'Se conservó tu borrador. Revisa los cambios que coinciden con otra modificación.'
        : `Configuración actualizada sin perder tu borrador.${fusion.coincidencias ? ' Algunos cambios ya estaban guardados.' : ''}`)
    }
  }

  function cambiar(funcion: string, rol: string, valor: ValorAjuste) {
    if (!base) return
    setBorrador((actual) => cambiarCelda(base, actual, funcion, rol, valor))
    setMensaje(''); setError('')
  }
  function resolver(conflicto: Conflicto, conservar: boolean) {
    if (!base || (conservar && conflicto.bloqueado)) return
    setBorrador((actual) => cambiarCelda(base, actual, conflicto.funcion, conflicto.rol, conservar ? conflicto.propuesto : conflicto.guardado))
    setConflictos((actual) => actual.filter((c) => c.clave !== conflicto.clave))
  }
  async function actualizar() {
    const resultado = await consulta.refetch()
    if (resultado.isSuccess) {
      setIncierto(false); setError('')
      if (resultado.data.version === base?.version) setMensaje('La configuración sigue igual. Tu borrador y motivo se conservan.')
    }
    return resultado
  }
  async function guardar() {
    if (!base || enviando.current || mutacion.isPending || incierto || conflictos.length || errorMotivoAcceso(motivo) || dependenciasFaltantes(base, borrador).length) return false
    enviando.current = true
    setError(''); setMensaje('')
    try {
      const resultado = await mutacion.mutateAsync({ version: base.version, motivo: motivo.trim(), cambios: cambiosParaGuardar(borrador) })
      setBase(resultado); setBorrador({}); setConflictos([]); setMotivo(''); setIncierto(false)
      setMensaje(resultado.activa
        ? 'Cambios guardados. Los accesos por función están activos.'
        : 'Cambios guardados. La personalización sigue desactivada; continúan las reglas anteriores.')
      return true
    } catch (fallo) {
      const api = toApiError(fallo)
      setError(api.message)
      if (api.status === 409) {
        setIncierto(true)
        const nueva = await consulta.refetch()
        if (nueva.isSuccess) setIncierto(false)
      } else if (api.status === null || api.status >= 500 || api.code === 'resultado_no_confirmado') {
        setIncierto(true)
      }
      return false
    } finally {
      enviando.current = false
    }
  }
  function descartar() {
    setBorrador({}); setConflictos([]); setMotivo(''); setMensaje('Borrador descartado. No se modificó la configuración guardada.'); setError('')
  }
  function restablecerRol(rol: string) {
    if (!base) return
    setBorrador((actual) => base.funciones.filter((f) => f.delegable).reduce((copia, f) => cambiarCelda(base, copia, f.id, rol, null), actual))
    setMensaje(`Preparaste los valores iniciales del rol. Revisa el resumen antes de guardar.`)
  }
  const cambios = cambiosParaGuardar(borrador)
  const dependencias = base ? dependenciasFaltantes(base, borrador) : []
  const ocupado = mutacion.isPending || consulta.isFetching
  const errorMotivo = errorMotivoAcceso(motivo)
  return { base, borrador, cambios, conflictos, motivo, setMotivo, mensaje, error, incierto,
    consulta, ocupado, errorMotivo, dependencias, cambiar, resolver, actualizar, guardar, descartar, restablecerRol,
    puedeGuardar: cambios.length > 0 && !ocupado && !incierto && !conflictos.length && !errorMotivo && !dependencias.length }
}
