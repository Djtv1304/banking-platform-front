import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Landmark, WalletCards } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando } from '@/shared/ui'
import { useAuthStore } from '@/features/auth'
import { obtenerFicha } from '@/features/organizacion/api/productos.api'
import { useAgencias, useProductos, type Agencia, type Producto } from '@/features/catalogos'
import {
  a11y,
  BuscarCliente,
  FieldError,
  FormSection,
  nombreCliente,
  opcionClassName,
  useClientePorIdentificacion,
  type Cliente,
} from '@/features/tarjetas'
import type { CuentaAbierta as Cuenta } from '@/features/cuenta/api/apertura.contract'
import { consultarHabilitacion } from '@/features/cuenta/api/apertura.api'
import { ConfirmarAperturaDialog } from '@/features/cuenta/components/ConfirmarAperturaDialog'
import { CuentaAbierta } from '@/features/cuenta/components/CuentaAbierta'
import { useAbrirCuenta } from '@/features/cuenta/hooks/useAperturaCuenta'
import { campoErrorApertura, mensajeErrorApertura, type CampoApertura } from '@/features/cuenta/lib/apertura'
import { etiquetaAgencia, formatearMonto } from '@/features/cuenta/lib/formato'
import {
  aCuentaCreate,
  aperturaVacia,
  aperturaCuentaSchema,
  type AperturaCuentaData,
  type AperturaCuentaInput,
} from '@/features/cuenta/schemas/apertura-cuenta.schema'

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
  const id = props.cliente.idCliente
  const habilitacion = useQuery({
    queryKey: ['clientes', 'habilitacion', id],
    queryFn: () => consultarHabilitacion(id),
  })
  const productos = useProductos('Cuenta', undefined, props.cliente.idCliente)
  const agencias = useAgencias()
  const idAgenciaUsuario = useAuthStore((state) => state.user?.idAgencia ?? null)

  if (habilitacion.isPending) return <Cargando texto="Verificando la habilitación del cliente…" />
  if (habilitacion.isError) return <Aviso tono="error">No pudimos verificar la habilitación del cliente.</Aviso>
  if (!habilitacion.data.habilitado) {
    return <Aviso tono="error">
      El cliente no está habilitado para abrir una cuenta.
      <ul className="list-disc pl-5">
        {habilitacion.data.motivos.filter(motivo => motivo !== 'ARCHIVOS_NO_EXIGIDOS').map(motivo => (
          <li key={motivo}>{motivoHabilitacion(motivo)}</li>
        ))}
      </ul>
    </Aviso>
  }
  if (productos.isLoading || agencias.isLoading) return <Cargando texto="Cargando productos y agencias…" />
  if (productos.isError) return <Aviso tono="error">No pudimos cargar los productos de cuenta. Inténtalo más tarde.</Aviso>
  if (agencias.isError) return <Aviso tono="error">No pudimos cargar las agencias. Inténtalo más tarde.</Aviso>

  const conVariantes = productos.data.filter((producto) => producto.subproductos.length > 0)
  const activas = agencias.data.filter((agencia) => agencia.estado === 'A')
  if (!conVariantes.length) return <Aviso>No hay productos de cuenta disponibles para abrir.</Aviso>
  if (!activas.length) return <Aviso>No hay agencias activas donde abrir la cuenta.</Aviso>

  const agencia = activas.find(item => item.idAgencia === idAgenciaUsuario)
  if (!agencia) return <Aviso>Selecciona una agencia activa para abrir la cuenta.</Aviso>
  return <FormularioApertura {...props} productos={conVariantes} agencia={agencia} />
}

function motivoHabilitacion(codigo: string) {
  switch (codigo) {
    case 'CLIENTE_NO_ACTIVO': return 'El cliente debe estar activo.'
    case 'CONSENTIMIENTO_NO_VIGENTE': return 'Falta un consentimiento vigente.'
    case 'RIESGO_NO_APROBADO_VIGENTE': return 'Falta una evaluación de riesgo aprobada y vigente.'
    default: return codigo.startsWith('ARCHIVO_OBLIGATORIO_FALTANTE:')
      ? `Falta el archivo obligatorio ${codigo.split(':')[1]}.`
      : 'Revisa los requisitos de habilitación en la ficha del cliente.'
  }
}

interface FormularioAperturaProps extends DatosAperturaProps {
  productos: Producto[]
  agencia: Agencia
}

function FormularioApertura({ cliente, productos, agencia, onAbierta, onCancelar }: FormularioAperturaProps) {
  const subproductos = productos.flatMap((producto) => producto.subproductos.map((sub) => ({ ...sub, producto })))
  const buscarSubproducto = (id: string) => subproductos.find((sub) => String(sub.idSubProducto) === id)

  const {
    control,
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<AperturaCuentaInput, unknown, AperturaCuentaData>({
    resolver: zodResolver(aperturaCuentaSchema),
    defaultValues: aperturaVacia,
  })
  const idSubProducto = useWatch({ control, name: 'idSubProducto' })
  const elegido = buscarSubproducto(idSubProducto)
  const ficha = useQuery({
    queryKey: ['productos', 'ficha', elegido?.idSubProducto],
    queryFn: () => obtenerFicha(Number(idSubProducto)),
    enabled: elegido !== undefined,
  })
  const condiciones = ficha.data?.condiciones

  const abrir = useAbrirCuenta()
  const [porConfirmar, setPorConfirmar] = useState<AperturaCuentaData | null>(null)
  /** Adónde va el foco cuando el diálogo se cierra por un error del servidor */
  const focoTrasError = useRef<CampoApertura | 'aviso' | null>(null)
  const avisoError = useRef<HTMLParagraphElement>(null)

  const revisar = (valor: AperturaCuentaData) => {
    if (!condiciones) return
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

  const resumen = porConfirmar && elegido && [
    { label: 'Cliente', valor: `${nombreCliente(cliente)} · ${cliente.identificacion}` },
    { label: 'Producto', valor: `${elegido.producto.nombreProducto} · ${elegido.nombreSubProducto}` },
    { label: 'Agencia', valor: etiquetaAgencia(agencia) },
    { label: 'Estado inicial', valor: 'Pendiente de depósito' },
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
                  {sub.producto.tipoCuenta && `Cuenta ${sub.producto.tipoCuenta.toLowerCase()}`}
                </span>
              </span>
            </label>
          ))}
        </div>
        <FieldError id="idSubProducto" error={errors.idSubProducto?.message} />
        {elegido && ficha.isPending && <Cargando texto="Cargando las condiciones vigentes…" />}
        {elegido && ficha.isError && <Aviso tono="error">No pudimos consultar las condiciones vigentes.</Aviso>}
        {elegido && ficha.isSuccess && !condiciones && <Aviso>El subproducto no tiene condiciones vigentes.</Aviso>}
        {condiciones && (
          <div className="rounded-xl border border-border p-4">
            <h3 className="font-semibold text-heading">Condiciones vigentes</h3>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt>Depósito mínimo</dt><dd>{formatearMonto(condiciones.montoAperturaMinimo)}</dd></div>
              <div><dt>Saldo mínimo</dt><dd>{formatearMonto(condiciones.saldoMinimo)}</dd></div>
              <div><dt>Interés anual</dt><dd>{condiciones.tasaInteresAnual}%</dd></div>
              <div><dt>Mantenimiento</dt><dd>{formatearMonto(condiciones.costoMantenimiento)}</dd></div>
              <div><dt>Vigente desde</dt><dd>{condiciones.vigenciaDesde}</dd></div>
              {condiciones.vigenciaHasta && <div><dt>Vigente hasta</dt><dd>{condiciones.vigenciaHasta}</dd></div>}
            </dl>
          </div>
        )}
      </FormSection>

      <FormSection numero={3} title="Apertura" description="La cuenta se abre en tu agencia activa y queda pendiente del primer depósito.">
        <p className="font-medium text-heading">{etiquetaAgencia(agencia)}</p>
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
        <Button type="submit" disabled={!!elegido && !condiciones} className="h-[52px] rounded-xl px-8 text-base font-semibold hover:bg-primary/90">
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
