import { RegistroClienteForm } from '@/features/clientes/components/RegistroClienteForm'

export function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Registrar cliente</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Ingresa los datos personales del nuevo cliente. Todos los campos son obligatorios.
      </p>

      <section className="mt-8 rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-10">
        <RegistroClienteForm />
      </section>
    </div>
  )
}
