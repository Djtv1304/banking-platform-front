import { RegistroClienteWizard } from '@/features/clientes/components/RegistroClienteWizard'

export function RegistrarClientePage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Registrar cliente</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Completa los tres pasos para incorporar al cliente a la cooperativa. Los campos sin la marca «opcional» son
        obligatorios.
      </p>

      <div className="mt-8">
        <RegistroClienteWizard />
      </div>
    </div>
  )
}
