import { ThemeToggle } from '@/shared/ui'
import { HelpCenterCard } from '../components/HelpCenterCard'
import { LoginForm } from '../components/LoginForm'
import { LoginHelp } from '../components/LoginHelp'
import { SignupCard } from '../components/SignupCard'
import { PromoSlider } from '../components/promo-slider/PromoSlider'

// TODO: reemplazar por la mutación de TanStack Query cuando exista el endpoint de autenticación.
// Por ahora solo simula la espera para mostrar el estado «Verificando…».
async function handleLogin() {
  await new Promise((resolve) => setTimeout(resolve, 1500))
}

export function LoginPage() {
  return (
    <div className="flex min-h-svh gap-6 bg-shell p-4 sm:p-6">
      <aside className="hidden w-[480px] shrink-0 flex-col gap-6 lg:flex">
        <PromoSlider />
        <HelpCenterCard />
      </aside>

      <main className="flex flex-1 flex-col rounded-[28px] bg-panel p-6">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="flex w-full max-w-[448px] flex-col gap-4">
            <section className="rounded-3xl border border-border bg-card p-8 shadow-xl shadow-brand-ink/5 sm:p-11 dark:shadow-none">
              <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Banca Virtual</h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Ingresa con tu usuario. ¿Es tu primera vez?{' '}
                <a href="#" className="font-semibold text-link hover:underline">
                  Crea tu usuario
                </a>
              </p>

              <div className="mt-10">
                <LoginForm onSubmit={handleLogin} />
              </div>

              <div className="mt-8">
                <LoginHelp />
              </div>
            </section>

            <SignupCard />
          </div>
        </div>
      </main>
    </div>
  )
}
