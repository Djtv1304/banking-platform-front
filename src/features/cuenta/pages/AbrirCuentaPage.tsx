import { AperturaCuentaForm } from '@/features/cuenta/components/AperturaCuentaForm'

export function AbrirCuentaPage() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Abrir cuenta</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Abre una cuenta de ahorro o corriente a un cliente activo con su depósito inicial. Todos los campos son
        obligatorios.
      </p>

      <div className="mt-8">
        <AperturaCuentaForm />
      </div>
    </div>
  )
}
