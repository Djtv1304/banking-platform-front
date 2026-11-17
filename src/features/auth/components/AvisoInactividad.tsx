import { useEffect, useState } from 'react'

import {
  Aviso,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui'
import { seguirConectado, useInactividad } from '@/features/auth/inactividad'
import { signOut } from '@/features/auth/session'

/** Se monta al abrir el aviso (el contenido del diálogo se desmonta al cerrarlo) */
function CuentaRegresiva({ venceEn }: { venceEn: number }) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    const temporizador = setInterval(() => setAhora(Date.now()), 1_000)
    return () => clearInterval(temporizador)
  }, [])
  const segundos = Math.ceil(Math.max(0, venceEn - ahora) / 1_000)
  return (
    <strong className="font-semibold text-foreground tabular-nums">
      {Math.floor(segundos / 60)}:{String(segundos % 60).padStart(2, '0')}
    </strong>
  )
}

/** Aviso al minuto 13 sin actividad: «Seguir conectado» renueva la sesión (POST /auth/refresh). */
export function AvisoInactividad() {
  const venceEn = useInactividad((state) => state.venceEn)
  const renovando = useInactividad((state) => state.renovando)
  const fallo = useInactividad((state) => state.fallo)
  const [cerrando, setCerrando] = useState(false)

  return (
    <Dialog open={venceEn !== null}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Tu sesión está por cerrarse</DialogTitle>
          <DialogDescription>
            Por seguridad, la sesión se cierra tras 15 minutos sin actividad. Se cerrará en{' '}
            {venceEn !== null && <CuentaRegresiva venceEn={venceEn} />}.
          </DialogDescription>
        </DialogHeader>
        {fallo && <Aviso tono="error">No pudimos renovar la sesión. Revisa tu conexión e inténtalo nuevamente.</Aviso>}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={cerrando}
            onClick={() => {
              setCerrando(true)
              void signOut()
            }}
          >
            {cerrando ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </Button>
          <Button autoFocus disabled={renovando || cerrando} onClick={() => void seguirConectado()}>
            {renovando ? 'Renovando…' : 'Seguir conectado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
