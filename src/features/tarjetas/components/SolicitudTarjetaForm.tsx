import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, CreditCard, Info, LoaderCircle, MapPin, PenLine, Star, Wallet } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Badge, Button, Checkbox, Input, Label } from '@/shared/ui'
import { useCiudades, useProductos } from '@/features/catalogos'
import { ESTADOS_TERMINALES, type Cliente, type Tarjeta } from '@/features/tarjetas/api/tarjetas.contract'
import { BuscarCliente } from '@/features/tarjetas/components/BuscarCliente'
import { Field, FieldError, fieldClassName, FormSection, SelectField } from '@/features/tarjetas/components/form-fields'
import { SolicitudRegistrada } from '@/features/tarjetas/components/SolicitudRegistrada'
import { VistaPreviaTarjeta } from '@/features/tarjetas/components/VistaPreviaTarjeta'
import {
  useClientePorIdentificacion,
  useCuentasCliente,
  useDireccionesCliente,
  useSolicitarTarjeta,
  useTarjetasPrincipales,
} from '@/features/tarjetas/hooks/useSolicitudTarjeta'
import { a11y, cuentaAdmiteTarjeta, nombreCliente, opcionClassName } from '@/features/tarjetas/lib/formulario'
import {
  aSolicitud,
  DIRECCION_NUEVA,
  NOMBRE_TARJETA_MAX,
  nombreImpreso,
  SOLICITUD_VACIA,
  solicitudTarjetaSchema,
  textoDireccion,
  type DireccionEnvio,
  type SolicitudTarjetaData,
  type SolicitudTarjetaInput,
} from '@/features/tarjetas/schemas/solicitud-tarjeta.schema'

const TIPOS_TARJETA = [
  { value: 'Debito', label: 'Débito', descripcion: 'Retira y paga con el saldo de la cuenta' },
] as const

/** Las tarjetas de envío se entregan en Ecuador */
const PAIS_ENVIO = 'ECU'

export function SolicitudTarjetaForm() {
  const [identificacion, setIdentificacion] = useState<string>()
  const [registrada, setRegistrada] = useState<Tarjeta | null>(null)

  const form = useForm<SolicitudTarjetaInput, unknown, SolicitudTarjetaData>({
    resolver: zodResolver(solicitudTarjetaSchema),
    defaultValues: SOLICITUD_VACIA,
  })
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = form

  const consultaCliente = useClientePorIdentificacion(identificacion)
  const cliente: Cliente | null = consultaCliente.data ?? null
  const solicitar = useSolicitarTarjeta()

  const [
    idCuenta,
    tipoTarjeta,
    idSubProducto,
    nombreTarjeta,
    esExtension,
    requiereEnvio,
    origenDireccion,
    provinciaEnvio,
  ] = useWatch({
    control,
    name: [
      'idCuenta',
      'tipoTarjeta',
      'idSubProducto',
      'nombreTarjeta',
      'esExtension',
      'requiereEnvio',
      'origenDireccion',
      'provinciaEnvio',
    ],
  })

  const { data: cuentas, isFetching: cargandoCuentas } = useCuentasCliente(cliente?.idCliente)
  const { data: productos, isLoading: cargandoProductos } = useProductos('Tarjeta', tipoTarjeta, cliente?.idCliente)
  const { data: tarjetasCuenta } = useTarjetasPrincipales(idCuenta ? Number(idCuenta) : undefined, esExtension)
  const { data: direcciones, isFetching: cargandoDirecciones } = useDireccionesCliente(
    cliente?.idCliente,
    requiereEnvio,
  )
  const { data: ciudades } = useCiudades(requiereEnvio ? PAIS_ENVIO : undefined)
  const nombreCiudad = (idCiudad: number) => ciudades.find((ciudad) => ciudad.idCiudad === idCiudad)?.nombre

  const subproductos = productos.flatMap((producto) =>
    producto.subproductos.map((sub) => ({ ...sub, idProducto: producto.idProducto })),
  )
  const subproducto = subproductos.find((sub) => String(sub.idSubProducto) === idSubProducto)
  // La titular debe ser una tarjeta principal (ya filtrada por TAR-02) y vigente de la misma cuenta
  const titulares = (tarjetasCuenta ?? []).filter(
    (tarjeta) => !(ESTADOS_TERMINALES as readonly string[]).includes(tarjeta.estadoActual),
  )
  const provincias = [...new Set(ciudades.map((ciudad) => ciudad.provincia))].sort((a, b) => a.localeCompare(b, 'es'))
  const ciudadesProvincia = ciudades.filter((ciudad) => ciudad.provincia === provinciaEnvio)

  const buscarCliente = (valor: string) => {
    if (valor === identificacion) return
    reset(SOLICITUD_VACIA)
    solicitar.reset()
    setIdentificacion(valor)
  }

  const elegirCuenta = (valor: string) => {
    setValue('idCuenta', valor, { shouldValidate: true })
    setValue('idTarjetaTitular', '')
    // El nombre impreso se sugiere con el del cliente; el asesor puede ajustarlo
    if (cliente && !form.getValues('nombreTarjeta')) setValue('nombreTarjeta', nombreImpreso(nombreCliente(cliente)))
  }

  const cambiarTipo = (valor: string) => {
    setValue('tipoTarjeta', valor as SolicitudTarjetaInput['tipoTarjeta'])
    // Los subproductos dependen del tipo: el elegido ya no aplica
    setValue('idSubProducto', '')
  }

  /** Dirección elegida del cliente o la escrita a mano; null si no hay envío */
  const resolverEnvio = (valor: SolicitudTarjetaData): DireccionEnvio | null | undefined => {
    if (!valor.requiereEnvio) return null
    if (valor.origenDireccion === DIRECCION_NUEVA) {
      return { texto: valor.direccionEnvio, idCiudad: Number(valor.idCiudadEnvio) }
    }
    const direccion = direcciones?.find((d) => String(d.idDireccion) === valor.origenDireccion)
    return direccion && { texto: textoDireccion(direccion), idCiudad: direccion.idCiudad }
  }

  const enviar = (valor: SolicitudTarjetaData) => {
    const envio = resolverEnvio(valor)
    if (!subproducto || envio === undefined) return
    solicitar.mutate(aSolicitud(valor, subproducto.idProducto, envio), { onSuccess: setRegistrada })
  }

  const nuevaSolicitud = () => {
    reset(SOLICITUD_VACIA)
    solicitar.reset()
    setRegistrada(null)
    setIdentificacion(undefined)
  }

  if (registrada && cliente) {
    return <SolicitudRegistrada tarjeta={registrada} cliente={cliente} onNueva={nuevaSolicitud} />
  }

  const cuentaElegida = cuentas?.find((cuenta) => String(cuenta.idCuenta) === idCuenta)

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <section className="flex flex-col gap-10 rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-10">
        <FormSection numero={1} title="Cliente" description="Busca al cliente que solicita la tarjeta.">
          <BuscarCliente
            buscada={identificacion}
            cliente={cliente}
            buscando={consultaCliente.isFetching}
            error={consultaCliente.error}
            onBuscar={buscarCliente}
          />
        </FormSection>

        {cliente && (
          <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-10">
            <FormSection
              numero={2}
              title="Cuenta"
              description="La tarjeta se asocia a una cuenta activa del cliente."
            >
              {cargandoCuentas && <Cargando texto="Cargando cuentas…" />}
              {cuentas && cuentas.length === 0 && (
                <p className="rounded-xl border border-border bg-field px-4 py-3 text-sm text-muted-foreground">
                  El cliente no tiene cuentas. Abre una cuenta antes de solicitar la tarjeta.
                </p>
              )}
              {cuentas && cuentas.length > 0 && (
                <div role="radiogroup" aria-label="Cuenta" className="flex flex-col gap-2" {...a11y('idCuenta', errors.idCuenta?.message)}>
                  {cuentas.map((cuenta) => {
                    const activa = cuentaAdmiteTarjeta(cuenta.estado)
                    return (
                      <label key={cuenta.idCuenta} className={opcionClassName}>
                        <input
                          type="radio"
                          name="idCuenta"
                          value={String(cuenta.idCuenta)}
                          checked={idCuenta === String(cuenta.idCuenta)}
                          disabled={!activa}
                          onChange={(event) => elegirCuenta(event.target.value)}
                          className="peer sr-only"
                        />
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground peer-checked:bg-primary peer-checked:text-primary-foreground">
                          <Wallet className="size-[18px]" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="font-medium text-heading">{cuenta.numeroCuenta}</span>
                          <span className="text-sm text-muted-foreground">
                            Cuenta {cuenta.tipoCuenta.toLowerCase()} · Agencia {cuenta.idAgencia}
                          </span>
                        </span>
                        <Badge variant={activa ? 'secondary' : 'destructive'}>{cuenta.estado}</Badge>
                      </label>
                    )
                  })}
                </div>
              )}
              <FieldError id="idCuenta" error={errors.idCuenta?.message} />
            </FormSection>

            {idCuenta && (
              <>
                <FormSection
                  numero={3}
                  title="Tarjeta"
                  description="Elige el tipo de tarjeta y el producto. Solo se muestran los productos de ese tipo."
                >
                  <div role="radiogroup" aria-label="Tipo de tarjeta" className="grid gap-3 sm:grid-cols-2">
                    {TIPOS_TARJETA.map((tipo) => (
                      <label key={tipo.value} className={cn(opcionClassName, 'items-start')}>
                        <input
                          type="radio"
                          name="tipoTarjeta"
                          value={tipo.value}
                          checked={tipoTarjeta === tipo.value}
                          onChange={(event) => cambiarTipo(event.target.value)}
                          className="peer sr-only"
                        />
                        <span className="flex flex-col">
                          <span className="font-semibold text-heading">{tipo.label}</span>
                          <span className="text-sm text-muted-foreground">{tipo.descripcion}</span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-[15px] font-semibold text-heading">Producto de tarjeta</span>
                    {cargandoProductos && <Cargando texto="Cargando productos…" />}
                    {!cargandoProductos && subproductos.length === 0 && (
                      <p className="rounded-xl border border-border bg-field px-4 py-3 text-sm text-muted-foreground">
                        No hay productos de tarjeta de este tipo disponibles.
                      </p>
                    )}
                    <div
                      role="radiogroup"
                      aria-label="Producto de tarjeta"
                      className="flex flex-col gap-2"
                      {...a11y('idSubProducto', errors.idSubProducto?.message)}
                    >
                      {subproductos.map((sub) => (
                        <label key={sub.idSubProducto} className={opcionClassName}>
                          <input
                            type="radio"
                            value={String(sub.idSubProducto)}
                            className="peer sr-only"
                            {...register('idSubProducto')}
                          />
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground peer-checked:bg-primary peer-checked:text-primary-foreground">
                            <CreditCard className="size-[18px]" />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="font-medium text-heading">{sub.nombreSubProducto}</span>
                            <span className="text-sm text-muted-foreground">{sub.codigoSubProducto}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <FieldError id="idSubProducto" error={errors.idSubProducto?.message} />
                  </div>

                  <Field
                    id="nombreTarjeta"
                    label="Nombre impreso en la tarjeta"
                    error={errors.nombreTarjeta?.message}
                    hint={`Tal como aparecerá grabado. Mayúsculas, sin tildes, máximo ${NOMBRE_TARJETA_MAX} caracteres.`}
                  >
                    <Input
                      id="nombreTarjeta"
                      autoComplete="off"
                      maxLength={NOMBRE_TARJETA_MAX}
                      className={cn(fieldClassName, 'uppercase')}
                      {...register('nombreTarjeta', { setValueAs: (valor: string) => valor.toUpperCase() })}
                      {...a11y('nombreTarjeta', errors.nombreTarjeta?.message)}
                    />
                  </Field>

                  <CasillaConDetalle
                    id="esExtension"
                    control={control}
                    name="esExtension"
                    titulo="Es una tarjeta adicional (extensión)"
                    descripcion="Se emite sobre una tarjeta principal vigente de la misma cuenta."
                  />

                  {esExtension && (
                    <Controller
                      control={control}
                      name="idTarjetaTitular"
                      render={({ field, fieldState }) => (
                        <Field id="idTarjetaTitular" label="Tarjeta titular" error={fieldState.error?.message}>
                          <SelectField
                            id="idTarjetaTitular"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            error={fieldState.error?.message}
                            placeholder={titulares.length ? 'Selecciona la tarjeta titular' : 'La cuenta no tiene tarjetas vigentes'}
                            disabled={!titulares.length}
                            options={titulares.map((tarjeta) => ({
                              value: String(tarjeta.idTarjeta),
                              label: `${tarjeta.numeroEnmascarado} · ${tarjeta.nombreTarjeta} · ${tarjeta.estadoActual}`,
                            }))}
                          />
                        </Field>
                      )}
                    />
                  )}
                </FormSection>

                <FormSection
                  numero={4}
                  title="Entrega"
                  description="Por defecto el cliente retira la tarjeta en la agencia."
                >
                  <CasillaConDetalle
                    id="requiereEnvio"
                    control={control}
                    name="requiereEnvio"
                    titulo="Enviar la tarjeta a domicilio"
                    descripcion="La tarjeta se envía a la dirección indicada."
                  />

                  {requiereEnvio && (
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[15px] font-semibold text-heading">Dirección de envío</span>
                      {cargandoDirecciones && <Cargando texto="Cargando direcciones del cliente…" />}
                      <div
                        role="radiogroup"
                        aria-label="Dirección de envío"
                        className="flex flex-col gap-2"
                        {...a11y('origenDireccion', errors.origenDireccion?.message)}
                      >
                        {(direcciones ?? []).map((direccion) => (
                          <label key={direccion.idDireccion} className={cn(opcionClassName, 'items-start')}>
                            <input
                              type="radio"
                              value={String(direccion.idDireccion)}
                              className="peer sr-only"
                              {...register('origenDireccion')}
                            />
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground peer-checked:bg-primary peer-checked:text-primary-foreground">
                              <MapPin className="size-[18px]" />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="flex items-center gap-2 font-medium text-heading">
                                {direccion.tipoDireccion}
                                {direccion.esPrincipal && (
                                  <Badge className="h-5 gap-1 px-2">
                                    <Star className="fill-current" />
                                    Principal
                                  </Badge>
                                )}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {textoDireccion(direccion)}
                                {nombreCiudad(direccion.idCiudad) && ` · ${nombreCiudad(direccion.idCiudad)}`}
                              </span>
                            </span>
                          </label>
                        ))}
                        <label className={opcionClassName}>
                          <input
                            type="radio"
                            value={DIRECCION_NUEVA}
                            className="peer sr-only"
                            {...register('origenDireccion')}
                          />
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground peer-checked:bg-primary peer-checked:text-primary-foreground">
                            <PenLine className="size-[18px]" />
                          </span>
                          <span className="flex flex-col">
                            <span className="font-medium text-heading">Otra dirección</span>
                            <span className="text-sm text-muted-foreground">Escríbela a mano solo para este envío</span>
                          </span>
                        </label>
                      </div>
                      <FieldError id="origenDireccion" error={errors.origenDireccion?.message} />
                    </div>
                  )}

                  {requiereEnvio && origenDireccion === DIRECCION_NUEVA && (
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Field
                        id="direccionEnvio"
                        label="Dirección"
                        error={errors.direccionEnvio?.message}
                        className="sm:col-span-2"
                      >
                        <Input
                          id="direccionEnvio"
                          placeholder="Calle principal, número y referencia"
                          maxLength={250}
                          className={fieldClassName}
                          {...register('direccionEnvio')}
                          {...a11y('direccionEnvio', errors.direccionEnvio?.message)}
                        />
                      </Field>
                      <Controller
                        control={control}
                        name="provinciaEnvio"
                        render={({ field }) => (
                          <Field id="provinciaEnvio" label="Provincia">
                            <SelectField
                              id="provinciaEnvio"
                              value={field.value}
                              onChange={(valor) => {
                                field.onChange(valor)
                                setValue('idCiudadEnvio', '')
                              }}
                              placeholder="Selecciona la provincia"
                              options={provincias.map((provincia) => ({ value: provincia, label: provincia }))}
                            />
                          </Field>
                        )}
                      />
                      <Controller
                        control={control}
                        name="idCiudadEnvio"
                        render={({ field, fieldState }) => (
                          <Field id="idCiudadEnvio" label="Ciudad" error={fieldState.error?.message}>
                            <SelectField
                              id="idCiudadEnvio"
                              value={field.value}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              error={fieldState.error?.message}
                              disabled={!provinciaEnvio}
                              placeholder={provinciaEnvio ? 'Selecciona la ciudad' : 'Primero elige la provincia'}
                              options={ciudadesProvincia.map((ciudad) => ({
                                value: String(ciudad.idCiudad),
                                label: ciudad.nombre,
                              }))}
                            />
                          </Field>
                        )}
                      />
                    </div>
                  )}
                </FormSection>

                <div className="flex gap-3 rounded-2xl border border-border bg-field p-4 text-sm text-muted-foreground">
                  <Info className="mt-0.5 size-5 shrink-0 text-link" />
                  <p>
                    La tarjeta queda <span className="font-semibold text-heading">Solicitada</span> y pasa a
                    aprobación. El PIN lo genera el sistema al aprobarla: nadie lo ingresa ni lo conoce.
                    {tipoTarjeta === 'Debito'
                      ? ' Llega impreso con la tarjeta y el cliente lo cambia en el primer uso del cajero.'
                      : ' En crédito no se entrega; el cliente lo solicita al servicio al cliente.'}
                  </p>
                </div>

                {solicitar.isError && (
                  <p role="alert" className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <CircleAlert className="size-4 shrink-0" />
                    {solicitar.error.message}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={nuevaSolicitud}
                    className="h-[52px] rounded-xl px-6 text-base"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={solicitar.isPending}
                    className="h-[52px] rounded-xl px-8 text-base font-semibold hover:bg-primary/90"
                  >
                    {solicitar.isPending ? <LoaderCircle className="animate-spin" /> : <CreditCard />}
                    Solicitar tarjeta
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </section>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <VistaPreviaTarjeta
          tipoTarjeta={tipoTarjeta}
          nombre={nombreTarjeta}
          producto={subproducto?.nombreSubProducto}
          extension={esExtension}
        />
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border text-sm">
          <Resumen label="Cliente" valor={cliente ? nombreCliente(cliente) : undefined} />
          <Resumen label="Cuenta" valor={cuentaElegida?.numeroCuenta} />
          <Resumen label="Producto" valor={subproducto?.nombreSubProducto} />
          <Resumen label="Entrega" valor={requiereEnvio ? 'Envío a domicilio' : 'Retiro en agencia'} />
        </dl>
      </aside>
    </div>
  )
}

function Cargando({ texto }: { texto: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" />
      {texto}
    </p>
  )
}

function Resumen({ label, valor }: { label: string; valor?: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('truncate font-medium', valor ? 'text-heading' : 'text-muted-foreground')}>{valor ?? '—'}</dd>
    </div>
  )
}

interface CasillaConDetalleProps {
  id: 'esExtension' | 'requiereEnvio'
  name: 'esExtension' | 'requiereEnvio'
  control: ReturnType<typeof useForm<SolicitudTarjetaInput, unknown, SolicitudTarjetaData>>['control']
  titulo: string
  descripcion: string
}

function CasillaConDetalle({ id, name, control, titulo, descripcion }: CasillaConDetalleProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-field p-4">
          <Checkbox
            id={id}
            ref={field.ref}
            checked={field.value}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            onBlur={field.onBlur}
            className="mt-0.5 size-5"
          />
          <Label htmlFor={id} className="flex flex-col items-start gap-1 font-normal">
            <span className="font-semibold text-heading">{titulo}</span>
            <span className="text-sm text-muted-foreground">{descripcion}</span>
          </Label>
        </div>
      )}
    />
  )
}
