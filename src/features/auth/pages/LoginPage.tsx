import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { ThemeToggle } from '@/shared/ui'
import { HelpCenterCard } from '../components/HelpCenterCard'
import { SignInButton } from '../components/SignInButton'
import { SignupCard } from '../components/SignupCard'
import { PromoSlider } from '../components/promo-slider/PromoSlider'
import { getLoginErrorMessage } from '../lib/login-errors'
import { sanitizeReturnTo } from '../lib/return-to'

export function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const returnTo = sanitizeReturnTo(searchParams.get('return_to'))
  // El callback del backend devuelve aquí con ?error=... si algo falló. Se lee una sola vez
  // y se quita de la URL para que no reaparezca al recargar.
  const [errorMessage] = useState(() => getLoginErrorMessage(searchParams.get('error')))

  useEffect(() => {
    if (!searchParams.has('error')) return
    setSearchParams(
      (params) => {
        params.delete('error')
        return params
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

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
                Ingresa de forma segura para gestionar tus productos.
              </p>

              {errorMessage && (
                <p
                  role="alert"
                  className="mt-8 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {errorMessage}
                </p>
              )}

              <div className="mt-10">
                <SignInButton returnTo={returnTo} />
              </div>

              <p className="mt-6 flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                Te llevaremos a nuestra página segura de acceso. Al terminar, volverás automáticamente a tu Banca
                Virtual.
              </p>
            </section>

            <SignupCard />
          </div>
        </div>
      </main>
    </div>
  )
}
