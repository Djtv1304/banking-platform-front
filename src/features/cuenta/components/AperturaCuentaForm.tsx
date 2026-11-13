import { useRef, useState } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Landmark, WalletCards } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Aviso, Button, Cargando, Input } from '@/shared/ui'
import { useAuthStore } from '@/features/auth'
import { useAgencias, useProductos, type Agencia, type Producto } from '@/features/catalogos'
import {
  a11y,
  BuscarCliente,
  Field,
  FieldError,
  fieldClassName,
  FormSection,
  nombreCliente,
  opcionClassName,
  useClientePorIdentificacion,
  type Cliente,
} from '@/features/tarjetas'
import type { CuentaAbierta as Cuenta } from '@/features/cuenta/api/apertura.contract'
import { ConfirmarAperturaDialog } from '@/features/cuenta/components/ConfirmarAperturaDialog'
import { CuentaAbierta } from '@/features/cuenta/components/CuentaAbierta'
import { useAbrirCuenta } from '@/features/cuenta/hooks/useAperturaCuenta'
import { campoErrorApertura, mensajeErrorApertura, type CampoApertura } from '@/features/cuenta/lib/apertura'
import { etiquetaAgencia, formatearMonto } from '@/features/cuenta/lib/formato'
import {
  aCuentaCreate,
  aperturaVacia,
  crearAperturaCuentaSchema,
  type AperturaCuentaData,
  type AperturaCuentaInput,
} from '@/features/cuenta/schemas/apertura-cuenta.schema'

const selectClassName = cn(
  fieldClassName,
  'w-full border text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:scheme-dark',
)

/** A-01 · Busca al cliente y, si está activo, abre su cuenta de ahorro o corriente */
export function AperturaCuentaForm() {
  const [identificacion, setIdentificacion] = useState<string>()
  const [abierta, setAbierta] = useState<Cuenta | null>(null)

  const consultaCliente = useClientePorIdentificacion(identificacion)
  const cliente: Cliente | null = consultaCliente.data ?? null

  const buscarCliente = (valor: string) => {
    if (valor !== identificacion) setIdentificacion(valor)
  }

  const nuevaApertura = () => {
    setAbierta(null)
    setIdentificacion(undefined)
  }

  if (abierta && cliente) {
    return <CuentaAbierta cuenta={abierta} nombreCliente={nombreCliente(cliente)} onNueva={nuevaApertura} />
  }

  return (
    <section className="flex flex-col gap-10 rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-10">
      <FormSection numero={1} title="Cliente" description="Busca al cliente que abre la cuenta. Debe estar activo.">
        <BuscarCliente
          buscada={identificacion}
          cliente={cliente}
          buscando={consultaCliente.isFetching}
          error={consultaCliente.error}
          onBuscar={buscarCliente}
          avisoInactivo="El cliente no está activo: no se le puede abrir una cuenta. Revisa su situación en su ficha."
        />
      </FormSection>

      {/* Un cliente no activo bloquea el resto: el backend lo rechazaría con CLIENTE_NO_ACTIVO */}
      {cliente?.estado === 'Activo' && (
        <DatosApertura key={cliente.idCliente} cliente={cliente} onAbierta={setAbierta} onCancelar={nuevaApertura} />
      )}
    </section>
  )
}

interface DatosAperturaProps {
  cliente: Cliente
  onAbierta: (cuenta: Cuenta) => void
  onCancelar: () => void
}

/** Espera los catálogos: la agencia del usuario se preselecciona al crear el formulario */
function DatosApertura(props: DatosAperturaProps) {
  const productos = useProductos('Cuenta')
  const agencias = useAgencias()
  const idAgenciaUsuario = useAuthStore((state) => state.user?.idAgencia ?? null)

  if (productos.isLoading || agencias.isLoading) return <Cargando texto="Cargando productos y agencias…" />
  if (productos.isError) return <Aviso tono="error">No pudimos cargar los productos de cuenta. Inténtalo más tarde.</Aviso>
  if (agencias.isError) return <Aviso tono="error">No pudimos cargar las agencias. Inténtalo más tarde.</Aviso>

  const conVariantes = productos.data.filter((producto) => producto.subproductos.length > 0)
  const activas = agencias.data.filter((agencia) => agencia.estado === 'A')
  if (!conVariantes.length) return <Aviso>No hay productos de cuenta disponibles para abrir.</Aviso>
  if (!activas.length) return <Aviso>No hay agencias activas donde abrir la cuenta.</Aviso>

  const idAgenciaInicial =
    idAgenciaUsuario && activas.some((agencia) => agencia.idAgencia === idAgenciaUsuario) ? idAgenciaUsuario : ''
  return <FormularioApertura {...props} productos={conVariantes} agencias={activas} idAgenciaInicial={idAgenciaInicial} />
}

interface FormularioAperturaProps extends DatosAperturaProps {
  productos: Producto[]
  agencias: Agencia[]
  idAgenciaInicial: string
}

function FormularioApertura({ cliente, productos, agencias, idAgenciaInicial, onAbierta, onCancelar }: FormularioAperturaProps) {
  const subproductos = productos.flatMap((producto) => producto.subproductos.map((sub) => ({ ...sub, producto })))
  const buscarSubproducto = (id: string) => subproductos.find((sub) => String(sub.idSubProducto) === id)

  // El mínimo sale del producto que se está validando, no de uno fijo
  const resolver: Resolver<AperturaCuentaInput, unknown, AperturaCuentaData> = (valores, contexto, opciones) =>
    zodResolver(crearAperturaCuentaSchema(buscarSubproducto(valores.idSubProducto)?.producto.montoAperturaMinimo ?? null))(
      valores,
      contexto,
      opciones,
    )

  const {
    control,
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<AperturaCuentaInput, unknown, AperturaCuentaData>({
    resolver,
    defaultValues: aperturaVacia(idAgenciaInicial),
  })
  const idSubProducto = useWatch({ control, name: 'idSubProducto' })
  const elegido = buscarSubproducto(idSubProducto)

  const abrir = useAbrirCuenta()
  const [porConfirmar, setPorConfirmar] = useState<AperturaCuentaData | null>(null)
  /** Adónde va el foco cuando el diálogo se cierra por un error del servidor */
  const focoTrasError = useRef<CampoApertura | 'aviso' | null>(null)
  const avisoError = useRef<HTMLParagraphElement>(null)

  const revisar = (valor: AperturaCuentaData) => {
    abrir.reset()
    setPorConfirmar(valor)
  }

  const confirmar = () => {
    if (!porConfirmar) return
    focoTrasError.current = null
    abrir.mutate(aCuentaCreate(porConfirmar, cliente.idCliente), {
      onSuccess: onAbierta,
      onError: (error) => {
        const apiError = toApiError(error)
        const campo = campoErrorApertura(apiError)
        if (campo) setError(campo, { message: mensajeErrorApertura(apiError) })
        focoTrasError.current = campo ?? 'aviso'
        setPorConfirmar(null)
      },
    })
  }

  const alCerrarDialogo = (event: Event) => {
    const destino = focoTrasError.current
    if (!destino) return
    event.preventDefault()
    focoTrasError.current = null
    if (destino === 'aviso') avisoError.current?.focus()
    else setFocus(destino)
  }

  const apiError = abrir.isError ? toApiError(abrir.error) : null
  // Los errores de un campo se muestran junto a él; el resto, en el aviso general
  const errorGeneral = apiError && !campoErrorApertura(apiError) ? mensajeErrorApertura(apiError) : null

  const agenciaDe = (id: string) => {
    const agencia = agencias.find((item) => item.idAgencia === id)
    return agencia ? etiquetaAgencia(agencia) : id
  }
  const resumen = porConfirmar && elegido && [
    { label: 'Cliente', valor: `${nombreCliente(cliente)} · ${cliente.identificacion}` },
    { label: 'Producto', valor: `${elegido.producto.nombreProducto} · ${elegido.nombreSubProducto}` },
    { label: 'Agencia', valor: agenciaDe(porConfirmar.idAgencia) },
    { label: 'Depósito de apertura', valor: formatearMonto(porConfirmar.montoInicial) },
  ]

  return (
    <form onSubmit={handleSubmit(revisar)} noValidate className="flex flex-col gap-10">
      <FormSection numero={2} title="Producto" description="Elige el producto de cuenta y su variante.">
        <div
          role="radiogroup"
          aria-label="Producto de cuenta"
          className="flex flex-col gap-2"
          {...a11y('idSubProducto', errors.idSubProducto?.message)}
        >
          {subproductos.map((sub) => (
            <label key={sub.idSubProducto} className={opcionClassName}>
              <input type="radio" value={String(sub.idSubProducto)} className="peer sr-only" {...register('idSubProducto')} />
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground peer-checked:bg-primary peer-checked:text-primary-foreground">
                <Landmark className="size-[18px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium text-heading">
                  {sub.producto.nombreProducto} · {sub.nombreSubProducto}
                </span>
                <span className="text-sm text-muted-foreground">
                  {sub.producto.tipoCuenta && `Cuenta ${sub.producto.tipoCuenta.toLowerCase()} · `}
                  Depósito mínimo {formatearMonto(sub.producto.montoAperturaMinimo ?? 0)}
                </span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id="idSubProducto" error={errors.idSubProducto?.message} />
      </FormSection>

      <FormSection numero={3} title="Apertura" description="Agencia donde se abre la cuenta y depósito inicial en dólares.">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            id="idAgencia"
            label="Agencia"
            error={errors.idAgencia?.message}
            hint={idAgenciaInicial ? 'Por defecto, tu agencia.' : undefined}
          >
            <select id="idAgencia" className={selectClassName} {...register('idAgencia')} {...a11y('idAgencia', errors.idAgencia?.message)}>
              <option value="">Selecciona la agencia</option>
              {agencias.map((agencia) => (
                <option key={agencia.idAgencia} value={agencia.idAgencia}>
                  {etiquetaAgencia(agencia)}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="montoInicial"
            label="Depósito de apertura (USD)"
            error={errors.montoInicial?.message}
            hint={
              elegido
                ? `Mínimo para este producto: ${formatearMonto(elegido.producto.montoAperturaMinimo ?? 0)}.`
                : 'Elige el producto para ver el mínimo.'
            }
          >
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="montoInicial"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                className={cn(fieldClassName, 'pl-8 tabular-nums')}
                {...register('montoInicial')}
                {...a11y('montoInicial', errors.montoInicial?.message)}
              />
            </div>
          </Field>
        </div>
      </FormSection>

      {errorGeneral && (
        <p
          ref={avisoError}
          tabIndex={-1}
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive outline-none"
        >
          <CircleAlert className="size-4 shrink-0" />
          {errorGeneral}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" onClick={onCancelar} className="h-[52px] rounded-xl px-6 text-base">
          Cancelar
        </Button>
        <Button type="submit" className="h-[52px] rounded-xl px-8 text-base font-semibold hover:bg-primary/90">
          <WalletCards />
          Revisar y abrir cuenta
        </Button>
      </div>

      <ConfirmarAperturaDialog
        abierto={!!resumen}
        resumen={resumen || []}
        enviando={abrir.isPending}
        onConfirmar={confirmar}
        onCancelar={() => setPorConfirmar(null)}
        onCloseAutoFocus={alCerrarDialogo}
      />
    </form>
  )
}
