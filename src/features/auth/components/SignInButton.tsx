import { useEffect, useState } from 'react'
import { ArrowRight, LoaderCircle } from 'lucide-react'

import { Button } from '@/shared/ui'
import { buildLoginUrl } from '../api/auth.api'

interface SignInButtonProps {
  /** Ruta interna a la que volver después del login */
  returnTo?: string
}

/**
 * Enlace (no fetch): el backend responde con un 302 hacia el Hosted UI de WorkOS, que está en
 * otro dominio, así que el navegador debe hacer una navegación completa.
 */
export function SignInButton({ returnTo }: SignInButtonProps) {
  const [redirecting, setRedirecting] = useState(false)

  // Si el usuario vuelve con "Atrás" desde WorkOS, el navegador puede restaurar la página
  // desde caché (bfcache) con el estado "Redirigiendo…": se reinicia.
  useEffect(() => {
    const reset = (event: PageTransitionEvent) => {
      if (event.persisted) setRedirecting(false)
    }
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])

  return (
    <Button
      asChild
      className="h-[52px] w-full rounded-xl text-base font-semibold hover:bg-primary/90 aria-disabled:pointer-events-none aria-disabled:opacity-80"
    >
      <a href={buildLoginUrl(returnTo)} onClick={() => setRedirecting(true)} aria-disabled={redirecting || undefined}>
        {redirecting ? (
          <>
            <LoaderCircle className="size-5 animate-spin" />
            Redirigiendo…
          </>
        ) : (
          <>
            Iniciar sesión
            <ArrowRight className="size-5" />
          </>
        )}
      </a>
    </Button>
  )
}
