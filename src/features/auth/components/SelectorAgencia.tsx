import { escuchar, publicar } from '@/features/auth/lib/canal-sesion'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { obtenerContextoAgencias, seleccionarAgencia } from '@/features/auth/api/auth.api'
import { useAuthStore } from '@/features/auth/store/auth.store'
import { toApiError } from '@/shared/api'
import { Button } from '@/shared/ui'

/** La seleccion solo cambia despues de confirmacion del BFF. */
export function SelectorAgencia() {
  const [elegida, setElegida] = useState<string | null>(null)
  const cache = useQueryClient()
  const agenciaSesion = useAuthStore((s) => s.user?.idAgencia)
  const inicial = useRef(agenciaSesion)
  useEffect(() => {
    if (inicial.current !== agenciaSesion && inicial.current !== undefined) {
      void cache.cancelQueries().then(() => { cache.clear(); window.location.assign('/') })
    }
  }, [agenciaSesion, cache])
  const contexto = useQuery({ queryKey: ['auth', 'agencias'], queryFn: ({ signal }) => obtenerContextoAgencias(signal), retry: false })
  useEffect(() => escuchar((mensaje) => {
    if (mensaje.tipo === 'agencia-cambiada') {
      void cache.cancelQueries().then(() => { cache.clear(); window.location.assign('/') })
    }
  }), [cache])
  const cambio = useMutation({ mutationFn: (id: string | null) => seleccionarAgencia(id), retry: false, onSuccess: async () => {
    publicar({ tipo: "agencia-cambiada" })
    await cache.cancelQueries()
    cache.clear()
    window.location.assign('/')
  } })
  useEffect(() => {
    if (!contexto.data) return
    const { user, setSession } = useAuthStore.getState()
    if (user && user.idAgencia !== contexto.data.idAgencia) setSession({ ...user, idAgencia: contexto.data.idAgencia })
  }, [contexto.data])
  if (contexto.isPending) return <span role="status" className="text-xs">Verificando agencia...</span>
  if (contexto.isError) return <span role="alert" className="max-w-48 text-xs text-destructive">{toApiError(contexto.error).message}</span>
  const data = contexto.data
  if (!data) return null
  const actual = data.agenciasPermitidas.find((a) => a.idAgencia === data.idAgencia)
  const accesoTotal = data.alcanceGlobal || (data.accesoTodasAgencias && data.agenciasPermitidas.length > 1)
  const mostrarSelector = data.agenciasPermitidas.length > 1 || (!actual && data.agenciasPermitidas.length === 1)
  return <div className="flex flex-wrap items-center gap-2 text-xs">
    {accesoTotal && <span>Acceso a todas las agencias</span>}
    <span>Agencia operativa: {actual?.codigo ?? 'Selección requerida'}</span>
    {mostrarSelector && <>
      <select aria-label="Seleccionar agencia operativa" className="max-w-48 rounded-lg border border-border bg-card p-2" value={elegida ?? data.idAgencia ?? ''} disabled={cambio.isPending} onChange={(e) => setElegida(e.target.value)}>
        <option value="" disabled>Elige una agencia</option>
        {data.agenciasPermitidas.map((a) => <option key={a.idAgencia} value={a.idAgencia}>{a.idAgencia} - {a.codigo}</option>)}
      </select>
      <Button size="sm" disabled={!elegida || elegida === data.idAgencia || cambio.isPending} onClick={() => { if (elegida) cambio.mutate(elegida) }}>{cambio.isPending ? 'Cambiando...' : 'Cambiar'}</Button>
    </>}
    {data.agenciasPermitidas.length === 0 && <span role="alert">No hay agencias operativas autorizadas.</span>}
    {cambio.isError && <span role="alert" className="text-destructive">{toApiError(cambio.error).message}</span>}
  </div>
}
