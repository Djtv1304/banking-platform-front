import { useState } from 'react'
import { LoaderCircle, RefreshCw, UserRound } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { formatRol, hasAnyRole, useAuthStore } from '@/features/auth'
import { useAgencias } from '@/features/catalogos'
import { nombreCompleto, ROLES_GESTION_USUARIOS, useUsuario } from '@/features/usuarios'
import { nombreAgencia } from '@/features/boveda/lib/formato'

/**
 * Quién registró o autorizó un movimiento. GET /usuarios/{id} solo se llama cuando se pide «Ver
 * quién»: abrir el detalle no dispara nada. Si ese usuario ya se consultó (en otro movimiento o en
 * «Usuarios del sistema»), se muestra directo desde la caché, sin otra llamada.
 */
export function UsuarioOperacion({ idUsuario }: { idUsuario: number | null | undefined }) {
  const roles = useAuthStore((state) => state.user?.roles)
  // El endpoint es de ADMIN y SUPERVISOR: a los demás roles no se les ofrece una consulta que fallaría
  const puedeConsultar = hasAnyRole(roles ?? [], ROLES_GESTION_USUARIOS)
  const [pedido, setPedido] = useState(false)
  const usuario = useUsuario(idUsuario ?? null, puedeConsultar && pedido)
  const { data: agencias } = useAgencias()

  if (idUsuario == null) return <span className="font-normal text-muted-foreground">Sin registrar</span>
  if (!puedeConsultar) return <span className="font-normal text-muted-foreground">Usuario interno</span>

  if (usuario.data) {
    const { data } = usuario
    const detalle = [data.username, data.rol ? formatRol(data.rol) : null, data.idAgencia ? nombreAgencia(data.idAgencia, agencias) : null]
      .filter(Boolean)
      .join(' · ')
    return (
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold text-heading">{nombreCompleto(data)}</span>
        <span className="text-sm font-normal text-muted-foreground">{detalle}</span>
      </span>
    )
  }

  if (usuario.isFetching) {
    return (
      <span role="status" className="flex items-center gap-1.5 font-normal text-muted-foreground">
        <LoaderCircle aria-hidden className="size-4 animate-spin" />
        Buscando…
      </span>
    )
  }

  if (usuario.isError) {
    const { status } = toApiError(usuario.error)
    const mensaje =
      status === 404 ? 'Este usuario ya no existe.' : status === 403 ? 'Tu rol no tiene acceso a los datos de usuarios.' : 'No pudimos cargarlo.'
    return (
      <span className="flex flex-col items-start gap-1">
        <span className="text-sm font-normal text-destructive">{mensaje}</span>
        {status !== 404 && status !== 403 && (
          <BotonConsulta onClick={() => void usuario.refetch()} Icono={RefreshCw}>
            Reintentar
          </BotonConsulta>
        )}
      </span>
    )
  }

  return (
    <BotonConsulta onClick={() => setPedido(true)} Icono={UserRound}>
      Ver quién
    </BotonConsulta>
  )
}

function BotonConsulta({ onClick, Icono, children }: { onClick: () => void; Icono: typeof UserRound; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-1.5 inline-flex w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 font-semibold text-link outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icono aria-hidden className="size-4" />
      {children}
    </button>
  )
}
