import { RegistroClienteWizard } from '@/features/clientes/components/RegistroClienteWizard'
import { usePuedeFuncion, hasPermission, PERMISOS, usePermisos } from '@/features/auth'
import { Aviso } from '@/shared/ui'

export function RegistrarClientePage() {
  if (!usePuedeFuncion('clientes.registrar', hasPermission(usePermisos(), PERMISOS.clientesEditar))) {
    return <Aviso tono="error">No tienes acceso a Registrar cliente. Consulta al administrador.</Aviso>
  }
  return (
    <div className="relative mx-auto w-full max-w-4xl">
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
