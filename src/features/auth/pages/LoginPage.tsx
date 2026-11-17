import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'

import { ThemeToggle } from '@/shared/ui'
import { HelpCenterCard } from '@/features/auth/components/HelpCenterCard'
import { SignInButton } from '@/features/auth/components/SignInButton'
import { SignupCard } from '@/features/auth/components/SignupCard'
import { PromoSlider } from '@/features/auth/components/promo-slider/PromoSlider'
import { borrarCierrePendiente, leerCierrePendiente } from '@/features/auth/lib/cierre-pendiente'
import { getLoginErrorMessage, getMotivoCierreMessage, type AvisoLogin } from '@/features/auth/lib/login-errors'
import { sanitizeReturnTo } from '@/features/auth/lib/return-to'
import { useAuthStore } from '@/features/auth/store/auth.store'

export function LoginPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  // Cierre por inactividad: vuelve del logout de WorkOS sin parámetros, con el aviso guardado
  const [pendiente] = useState(leerCierrePendiente)
  const returnTo = sanitizeReturnTo(searchParams.get('return_to')) ?? pendiente?.returnTo
  // El callback del backend devuelve aquí con ?error=... si algo falló. Se lee una sola vez
  // y se quita de la URL para que no reaparezca al recargar.
  const [error] = useState(() => getLoginErrorMessage(searchParams.get('error')))
  // Por qué terminó la sesión anterior (401 con motivo o cierre por inactividad). Se muestra una vez.
  const [cierre] = useState(() =>
    getMotivoCierreMessage(useAuthStore.getState().motivoCierre ?? pendiente?.motivo ?? null),
  )

  useEffect(() => {
    if (useAuthStore.getState().motivoCierre) useAuthStore.getState().consumirMotivoCierre()
    borrarCierrePendiente()
  }, [])

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
      <aside className="hidden w-120 shrink-0 flex-col gap-6 lg:flex">
        <PromoSlider />
        <HelpCenterCard />
      </aside>

      <main className="flex flex-1 flex-col rounded-[28px] bg-panel p-6">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="flex w-full max-w-md flex-col gap-4">
            <section className="rounded-3xl border border-border bg-card p-8 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-11">
              <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Acceso al sistema</h1>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                Ingresa con tu usuario de funcionario para atender a los clientes de la cooperativa.
              </p>

              {error ? (
                <LoginNotice aviso={error} tono="error" />
              ) : (
                cierre && <LoginNotice aviso={cierre} tono="info" />
              )}

              <div className="mt-10">
                <SignInButton returnTo={returnTo} />
              </div>

              <p className="mt-6 flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                Te llevaremos a nuestra página segura de acceso. Al terminar, volverás automáticamente al sistema.
              </p>
            </section>

            <SignupCard />
          </div>
        </div>
      </main>
    </div>
  )
}

function LoginNotice({ aviso, tono }: { aviso: AvisoLogin; tono: 'error' | 'info' }) {
  return (
    <div
      role={tono === 'error' ? 'alert' : 'status'}
      className={
        tono === 'error'
          ? 'mt-8 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'
          : 'mt-8 rounded-xl border border-info/50 bg-info/15 px-4 py-3 text-sm text-foreground'
      }
    >
      <p>{aviso.mensaje}</p>
      {aviso.nota && <p className="mt-2 text-xs opacity-80">{aviso.nota}</p>}
    </div>
  )
}
