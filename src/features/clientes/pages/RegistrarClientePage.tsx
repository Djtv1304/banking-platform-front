import { RegistroClienteWizard } from '@/features/clientes/components/RegistroClienteWizard'
import { useAuthStore } from '@/features/auth'
import { Aviso } from '@/shared/ui'

export function RegistrarClientePage() {
  const roles = useAuthStore((state) => state.user?.roles)
  if (!roles?.some((rol) => ['ASESOR', 'ADMIN'].includes(rol.toUpperCase()))) return <Aviso tono="error">No tienes permiso para registrar clientes. Se requiere ASESOR o ADMIN.</Aviso>
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Registrar cliente</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Completa los tres pasos para registrar una persona natural con su dirección principal. Los campos sin la marca «opcional» son
        obligatorios.
      </p>

      <div className="mt-8">
        <RegistroClienteWizard />
      </div>
    </div>
  )
}
