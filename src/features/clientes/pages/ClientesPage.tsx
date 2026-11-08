import type { ComponentType } from 'react'

import { useAccessProfile, type AccessProfile } from '@/features/auth'
import { BuscarClienteView } from '@/features/clientes/components/vistas/BuscarClienteView'
import { MiInformacionView } from '@/features/clientes/components/vistas/MiInformacionView'

/** Una misma pestaña, dos vistas: el personal busca clientes y el cliente ve su propia información */
const VISTA_POR_PERFIL: Record<AccessProfile, ComponentType> = {
  admin: BuscarClienteView,
  staff: BuscarClienteView,
  cliente: MiInformacionView,
}

export function ClientesPage() {
  const profile = useAccessProfile()
  if (!profile) return null

  const Vista = VISTA_POR_PERFIL[profile]
  return <Vista />
}
