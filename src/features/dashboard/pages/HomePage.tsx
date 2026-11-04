import type { ComponentType } from 'react'

import { useAccessProfile, type AccessProfile } from '@/features/auth'
import { ClientHome } from '@/features/dashboard/components/ClientHome'
import { StaffHome } from '@/features/dashboard/components/StaffHome'

/** Qué Home ve cada perfil de acceso (ver `getAccessProfile` en features/auth) */
const HOME_BY_PROFILE: Record<AccessProfile, ComponentType> = {
  admin: ClientHome,
  cliente: ClientHome,
  staff: StaffHome,
}

export function HomePage() {
  const profile = useAccessProfile()
  if (!profile) return null

  const Home = HOME_BY_PROFILE[profile]
  return <Home />
}
