import { useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ArrowRight, CircleCheck, Download, WalletCards } from 'lucide-react'

import { Aviso, Button } from '@/shared/ui'
import { descargarFormularioApertura } from '@/features/cuenta/api/apertura.api'
import type { CuentaAbierta as Cuenta } from '@/features/cuenta/api/apertura.contract'
import { EstadoCuentaBadge } from '@/features/cuenta/components/EstadoCuentaBadge'
import { formatearMonto } from '@/features/cuenta/lib/formato'

interface CuentaAbiertaProps {
  cuenta: Cuenta
  nombreCliente: string
  onNueva: () => void
}

/** Resultado de CTA-01: los datos tal como los devolvió el servidor */
export function CuentaAbierta({ cuenta, nombreCliente, onNueva }: CuentaAbiertaProps) {
  const titulo = useRef<HTMLHeadingElement>(null)
  const formulario = useMutation({ mutationFn: () => descargarFormularioApertura(cuenta.idCuenta) })
  // El formulario desaparece: el foco pasa al resultado para que el lector de pantalla lo anuncie
  useEffect(() => {
    titulo.current?.focus()
  }, [])

  const resumen = [
    { label: 'Número de cuenta', valor: cuenta.numeroCuenta },
    { label: 'Tipo', valor: cuenta.tipoCuenta },
    { label: 'Saldo', valor: formatearMonto(cuenta.saldo) },
    { label: 'Cliente', valor: nombreCliente },
  ]

  return (
    <section
      role="status"
      className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-card p-6 py-10 text-center not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-10"
    >
      <span className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-link">
        <CircleCheck className="size-8" />
      </span>
      <div className="flex flex-col items-center gap-2">
        <h2 ref={titulo} tabIndex={-1} className="text-2xl font-bold text-heading outline-none">
          Cuenta abierta
        </h2>
        <p className="flex flex-wrap items-center justify-center gap-2 text-muted-foreground">
          Estado: <EstadoCuentaBadge estado={cuenta.estado} />
        </p>
      </div>

      <dl className="grid w-full max-w-lg gap-px overflow-hidden rounded-2xl border border-border bg-border text-left sm:grid-cols-2">
        {resumen.map(({ label, valor }) => (
          <div key={label} className="flex flex-col gap-0.5 bg-field px-4 py-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="truncate font-medium text-heading tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" disabled={formulario.isPending} onClick={() => formulario.mutate()}>
          <Download />
          {formulario.isPending ? 'Descargando…' : 'Descargar formulario'}
        </Button>
        <Button asChild variant="outline" className="h-[52px] rounded-xl px-6 text-base">
          <Link to={`/cuentas/${cuenta.idCuenta}`}>
            Ver la cuenta
            <ArrowRight />
          </Link>
        </Button>
        <Button onClick={onNueva} className="h-[52px] rounded-xl px-8 text-base font-semibold hover:bg-primary/90">
          <WalletCards />
          Abrir otra
        </Button>
      </div>
      {formulario.isError && <Aviso tono="error">No se pudo descargar el formulario. Verifica la agencia y las condiciones vigentes.</Aviso>}
    </section>
  )
}
