import { useState, type FormEvent } from 'react'
import { CircleAlert, LoaderCircle, Search, UserRound } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Badge, Button, Input } from '@/shared/ui'
import type { Cliente } from '@/features/tarjetas/api/tarjetas.contract'
import { fieldClassName, FieldError } from '@/features/tarjetas/components/form-fields'
import { a11y, nombreCliente } from '@/features/tarjetas/lib/formulario'

/** Cédula (10 dígitos) o RUC (13 dígitos) */
const IDENTIFICACION_REGEX = /^(\d{10}|\d{13})$/

interface BuscarClienteProps {
  /** Identificación ya buscada (`undefined` antes de la primera búsqueda) */
  buscada: string | undefined
  cliente: Cliente | null
  buscando: boolean
  error: Error | null
  onBuscar: (identificacion: string) => void
  /** Qué no se puede hacer con un cliente que no está activo (cambia según la pantalla que lo use) */
  avisoInactivo?: string
}

/** Búsqueda del cliente por su identificación exacta (CLI-03); la consulta vive en el formulario */
export function BuscarCliente({
  buscada,
  cliente,
  buscando,
  error,
  onBuscar,
  avisoInactivo = 'El cliente no está activo. Revisa su situación antes de solicitar una tarjeta.',
}: BuscarClienteProps) {
  const [texto, setTexto] = useState('')
  const [errorTexto, setErrorTexto] = useState<string>()

  const buscar = (event: FormEvent) => {
    event.preventDefault()
    const valor = texto.trim()
    if (!IDENTIFICACION_REGEX.test(valor)) {
      setErrorTexto('Ingresa una cédula de 10 dígitos o un RUC de 13 dígitos.')
      return
    }
    setErrorTexto(undefined)
    onBuscar(valor)
  }

  const sinResultado = buscada && !buscando && !error && !cliente

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={buscar} noValidate className="flex flex-col gap-2.5">
        <label htmlFor="identificacion" className="text-[15px] font-semibold text-heading">
          Identificación del cliente
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="identificacion"
              inputMode="numeric"
              autoComplete="off"
              value={texto}
              onChange={(event) => setTexto(event.target.value.replace(/\D/g, '').slice(0, 13))}
              placeholder="Cédula o RUC"
              className={cn(fieldClassName, 'pl-12')}
              {...a11y('identificacion', errorTexto)}
            />
          </div>
          <Button type="submit" variant="outline" disabled={buscando} className="h-[52px] rounded-xl px-6 text-base">
            {buscando ? <LoaderCircle className="animate-spin" /> : <Search />}
            Buscar
          </Button>
        </div>
        <FieldError id="identificacion" error={errorTexto} />
      </form>

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          {error.message}
        </p>
      )}

      {sinResultado && (
        <p role="status" className="rounded-xl border border-border bg-field px-4 py-3 text-sm text-muted-foreground">
          No hay un cliente registrado con la identificación <span className="font-semibold">{buscada}</span>.
        </p>
      )}

      {cliente && (
        <div className="flex items-center gap-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-link">
            <UserRound className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold text-heading">{nombreCliente(cliente)}</span>
            <span className="text-sm text-muted-foreground">
              {cliente.identificacion} · {cliente.tipoCliente === 'Natural' ? 'Persona natural' : 'Persona jurídica'}
            </span>
          </div>
          <Badge variant={cliente.estado === 'Activo' ? 'default' : 'destructive'}>{cliente.estado}</Badge>
        </div>
      )}

      {cliente && cliente.estado !== 'Activo' && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert className="size-4" />
          {avisoInactivo}
        </p>
      )}
    </div>
  )
}
