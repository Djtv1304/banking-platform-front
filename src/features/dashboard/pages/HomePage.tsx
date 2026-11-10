import { StaffHome } from '@/features/dashboard/components/StaffHome'

/**
 * Todos los perfiles ven el inicio de funcionario: el sistema lo usa sólo el
 * personal de la cooperativa, no sus clientes.
 */
export function HomePage() {
  return <StaffHome />
}
