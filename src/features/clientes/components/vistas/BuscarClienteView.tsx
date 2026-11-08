import type { ChangeEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRight,
  Building2,
  Check,
  CircleCheck,
  Globe,
  IdCard,
  Loader2,
  Search,
  UserPlus,
  UserRound,
  UserX,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/shared/lib'
import { Button, Input } from '@/shared/ui'
import type { ClienteResumen, TipoIdentificacion } from '@/features/clientes/api/clientes.contract'
import { useBuscarCliente } from '@/features/clientes/hooks/useClientes'
import { a11y } from '@/features/clientes/lib/a11y'
import { formatearFecha } from '@/features/clientes/lib/documentos'
import {
  detectarTipoIdentificacion,
  esIdentificacionValida,
  normalizarIdentificacion,
} from '@/features/clientes/lib/identificacion'
import {
  buscarClienteFormSchema,
  buscarClienteSchema,
  IDENTIFICACION_MAX_LENGTH,
  TIPOS_IDENTIFICACION,
  type BuscarClienteData,
  type BuscarClienteFormInput,
} from '@/features/clientes/schemas/buscar-cliente.schema'

const ICONO_TIPO: Record<TipoIdentificacion, LucideIcon> = { CEDULA: IdCard, RUC: Building2, PASAPORTE: Globe }

const soloDigitos = (valor: string) => /^\d+$/.test(valor)

/** El criterio vive en la URL: al volver desde la ficha del cliente, el resultado sigue ahí */
function useCriterioEnUrl() {
  const [searchParams, setSearchParams] = useSearchParams()
  const parsed = buscarClienteSchema.safeParse({
    tipoDocumento: searchParams.get('tipo') ?? '',
    identificacion: searchParams.get('identificacion') ?? '',
  })
  const criterio = parsed.success ? parsed.data : null
  const guardar = ({ tipoDocumento, identificacion }: BuscarClienteData) =>
    setSearchParams({ tipo: tipoDocumento, identificacion })
  return [criterio, guardar] as const
}

/** Vista del personal: detecta y valida el documento, y dice si el cliente ya existe (historia C-02) */
export function BuscarClienteView() {
  const [criterio, guardarCriterio] = useCriterioEnUrl()
  const busqueda = useBuscarCliente(criterio)

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BuscarClienteFormInput, unknown, BuscarClienteData>({
    resolver: zodResolver(buscarClienteFormSchema),
    defaultValues: {
      identificacion: criterio?.identificacion ?? '',
      // Un pasaporte numérico guardado en la URL se vuelve a marcar como pasaporte
      comoPasaporte: criterio?.tipoDocumento === 'PASAPORTE' && soloDigitos(criterio.identificacion),
    },
  })

  const valor = useWatch({ control, name: 'identificacion' })
  const comoPasaporte = useWatch({ control, name: 'comoPasaporte' })
  const tipo = detectarTipoIdentificacion(valor, comoPasaporte)
  const valido = tipo !== null && esIdentificacionValida(tipo, valor)
  // Un pasaporte puede ser solo números: en ese caso se deja elegir en lugar de adivinar
  // (se oculta si el número ya es una cédula o RUC válido, salvo que ya se haya marcado)
  const puedeSerPasaporteNumerico = soloDigitos(valor) && valor.length >= 5 && (!valido || comoPasaporte)

  const identificacion = register('identificacion')
  const onIdentificacionChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.target.value = normalizarIdentificacion(event.target.value)
    if (!soloDigitos(event.target.value)) setValue('comoPasaporte', false)
    return identificacion.onChange(event)
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Clientes</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Busca un cliente por su documento para ver su ficha, sus documentos y gestionar sus cuentas.
        </p>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8">
        <form onSubmit={handleSubmit(guardarCriterio)} noValidate className="flex flex-col gap-3">
          <label htmlFor="identificacion" className="text-sm font-semibold text-heading">
            Cédula, RUC o pasaporte
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="identificacion"
                autoComplete="off"
                spellCheck={false}
                maxLength={IDENTIFICACION_MAX_LENGTH}
                placeholder="Escribe o pega el número del documento"
                className="h-[52px] rounded-xl border-border bg-field pr-36 pl-12 text-base tabular-nums md:text-base dark:bg-field"
                {...a11y('identificacion', errors.identificacion?.message)}
                aria-describedby={errors.identificacion ? 'identificacion-error identificacion-tipo' : 'identificacion-tipo'}
                {...identificacion}
                onChange={onIdentificacionChange}
              />
              <TipoDetectado tipo={tipo} valido={valido} />
            </div>
            <Button
              type="submit"
              disabled={busqueda.isFetching}
              className="h-[52px] rounded-xl px-8 text-base font-semibold hover:bg-primary/90"
            >
              {busqueda.isFetching ? <Loader2 className="animate-spin" /> : <Search />}
              Buscar
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            {errors.identificacion ? (
              <p id="identificacion-error" className="text-sm text-destructive">
                {errors.identificacion.message}
              </p>
            ) : (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                Detectamos si es cédula, RUC o pasaporte y lo validamos antes de buscar.
              </p>
            )}

            {puedeSerPasaporteNumerico && (
              <button
                type="button"
                aria-pressed={comoPasaporte}
                onClick={() => setValue('comoPasaporte', !comoPasaporte, { shouldValidate: !!errors.identificacion })}
                className={cn(
                  'flex h-8 w-fit shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  comoPasaporte
                    ? 'border-primary bg-primary/15 text-heading'
                    : 'border-border text-muted-foreground hover:border-primary/60 hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded-full border',
                    comoPasaporte ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50',
                  )}
                >
                  {comoPasaporte && <Check className="size-3" strokeWidth={3} />}
                </span>
                Es un pasaporte solo con números
              </button>
            )}
          </div>
        </form>
      </section>

      <div aria-live="polite">
        {!criterio && <SinBusqueda />}
        {criterio && busqueda.isPending && <ResultadoCargando />}
        {criterio && busqueda.isError && (
          <p className="text-sm text-destructive">No pudimos completar la búsqueda. Inténtalo de nuevo.</p>
        )}
        {criterio && busqueda.isSuccess && busqueda.data && <ClienteEncontrado cliente={busqueda.data} />}
        {criterio && busqueda.isSuccess && !busqueda.data && (
          <ClienteNoEncontrado
            tipo={TIPOS_IDENTIFICACION[criterio.tipoDocumento].label}
            identificacion={criterio.identificacion}
          />
        )}
      </div>
    </div>
  )
}

/** Píldora dentro del campo con el tipo detectado; se marca con ✓ cuando el número ya es válido */
function TipoDetectado({ tipo, valido }: { tipo: TipoIdentificacion | null; valido: boolean }) {
  const Icono = tipo && ICONO_TIPO[tipo]

  return (
    <span
      id="identificacion-tipo"
      aria-live="polite"
      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
    >
      {tipo && Icono && (
        <span
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors',
            valido ? 'bg-info/25 text-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          <Icono className="size-3.5" />
          <span className="sr-only">Tipo detectado: </span>
          {TIPOS_IDENTIFICACION[tipo].label}
          {valido && <CircleCheck className="size-3.5 text-link" aria-label="válido" />}
        </span>
      )}
    </span>
  )
}

function SinBusqueda() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Search className="size-6" />
      </span>
      <p className="font-semibold text-heading">Busca un cliente para empezar</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Ingresa la cédula, el RUC o el pasaporte. Detectamos el tipo de documento y te diremos si el cliente ya existe
        en la cooperativa.
      </p>
    </div>
  )
}

function ResultadoCargando() {
  return (
    <div aria-busy="true" className="flex items-center gap-4 rounded-3xl border border-border bg-card p-6">
      <span className="size-14 animate-pulse rounded-full bg-muted" />
      <span className="flex flex-1 flex-col gap-2">
        <span className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <span className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </span>
      <span className="hidden h-11 w-44 animate-pulse rounded-xl bg-muted sm:block" />
    </div>
  )
}

/** Resultado en una sola fila: avatar, datos y acción, sin huecos */
function ClienteEncontrado({ cliente }: { cliente: ClienteResumen }) {
  const Icono = cliente.tipoCliente === 'NATURAL' ? UserRound : Building2
  const activo = cliente.estado === 'ACTIVO'

  return (
    <article className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6 not-dark:shadow-lg not-dark:shadow-brand-ink/5 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand-navy-deep text-white">
          <Icono className="size-6" />
          <span
            aria-hidden
            className={cn(
              'absolute -right-1 -bottom-1 size-4 rounded-full ring-3 ring-card',
              activo ? 'bg-info' : 'bg-muted-foreground/60',
            )}
          />
        </span>

        <div className="flex min-w-0 flex-col gap-1">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-link">
            <CircleCheck className="size-3.5" />
            Cliente registrado
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="truncate text-lg font-semibold text-heading">{cliente.nombre}</h2>
            <span
              className={cn(
                'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-xs font-semibold',
                activo ? 'bg-info/25 text-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              {activo ? <CircleCheck className="size-3" /> : <UserX className="size-3" />}
              {activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span className="tabular-nums">
              {TIPOS_IDENTIFICACION[cliente.tipoDocumento].label} {cliente.identificacion}
            </span>
            <span aria-hidden>·</span>
            <span>{cliente.tipoCliente === 'NATURAL' ? 'Persona natural' : 'Persona jurídica'}</span>
            <span aria-hidden>·</span>
            <span>Desde {formatearFecha(cliente.fechaRegistro)}</span>
          </p>
        </div>
      </div>

      <Button asChild className="h-11 shrink-0 rounded-xl px-6 font-semibold hover:bg-primary/90">
        <Link to={`/clientes/${cliente.idCliente}`}>
          Ver ficha
          <ArrowRight />
        </Link>
      </Button>
    </article>
  )
}

function ClienteNoEncontrado({ tipo, identificacion }: { tipo: string; identificacion: string }) {
  return (
    <article className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-primary/15 text-link">
        <UserX className="size-6" />
      </span>
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-semibold text-heading">No existe un cliente con este documento</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          El documento ({tipo}){' '}
          <span className="font-semibold text-heading tabular-nums">{identificacion}</span> es válido y no está
          registrado, así que puedes registrar al cliente sin crear un duplicado.
        </p>
      </div>
      <Button asChild variant="outline" className="mt-2 h-11 rounded-xl px-6 font-semibold">
        <Link to="/registrar-cliente">
          <UserPlus />
          Registrar cliente
        </Link>
      </Button>
    </article>
  )
}
