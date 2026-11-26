import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, CircleAlert, Download, Info, LoaderCircle, RotateCcw, Search, SearchX } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Badge, Button, Input } from '@/shared/ui'
import { usePuedeFuncion, useAuthStore, usePermisos } from '@/features/auth'
import { useAgencias } from '@/features/catalogos'
import { exportarClientes } from '@/features/clientes/api/clientes.api'
import { ESTADOS_CLIENTE, TIPOS_CLIENTE, type PaginaClientes, type ParametrosBusqueda } from '@/features/clientes/api/clientes.contract'
import { Field, fieldClassName } from '@/features/clientes/components/form-fields'
import { useBuscarClientes } from '@/features/clientes/hooks/useConsultaClientes'
import { useFiltrosClientes } from '@/features/clientes/hooks/useFiltrosClientes'
import { accesoDatosSensibles } from '@/features/clientes/lib/gestion-clientes'
import {
  armarBusqueda,
  FILTROS_TEXTO,
  NOMBRE_MAX,
  nombreVisible,
  ORDENES,
  TIPO_CLIENTE_LABEL,
  totalPaginas,
  varianteEstado,
} from '@/features/clientes/lib/consulta'

/*
 * C-03 / E5-05 · Búsqueda de clientes (POST /clientes/busqueda).
 *
 * Los filtros viven en el estado del componente y viajan en el cuerpo del POST, nunca en la URL:
 * documento, nombre y correo no deben quedar en el historial ni en los logs (ASVS 14.2.1).
 * Sin al menos un filtro no se consulta. Los resultados llegan enmascarados.
 */

const selectClassName = cn(
  fieldClassName,
  'w-full border text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:scheme-dark',
)

type FiltroTexto = (typeof FILTROS_TEXTO)[number]

export function BuscarClientesPage() {
  const { filtros, busqueda, cambiar, limpiar, buscar, irAPagina, iniciarComposicion, terminarComposicion } = useFiltrosClientes()
  const aplicada = armarBusqueda(busqueda.filtros, busqueda.page)
  const borrador = armarBusqueda(filtros, 1)
  const consulta = useBuscarClientes(aplicada.params)
  const agencias = useAgencias()
  const roles = useAuthStore((estado) => estado.user?.roles)
  const puedeExportar = usePuedeFuncion('clientes.exportar', accesoDatosSensibles(roles ?? [], usePermisos()).exportar)
  const exportacion = useMutation({ mutationFn: (params: ParametrosBusqueda) => exportarClientes(params) })
  const esperandoTexto = FILTROS_TEXTO.some((campo) => filtros[campo].trim() !== busqueda.filtros[campo].trim())
  const actualizando = aplicada.params !== null && (esperandoTexto || consulta.isFetching)
  const texto = (campo: FiltroTexto) => ({
    value: filtros[campo],
    onChange: (event: { target: { value: string } }) => cambiar(campo, event.target.value),
    onCompositionStart: iniciarComposicion,
    onCompositionEnd: (event: { currentTarget: { value: string } }) => terminarComposicion(campo, event.currentTarget.value),
  })
  const aplicarSiValido = () => { if (!borrador.aviso) buscar() }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Consultar clientes</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Busca por documento, nombre, correo, estado o agencia de registro y abre la ficha del cliente que atiendes.
      </p>

      <form
        onSubmit={(event) => { event.preventDefault(); aplicarSiValido() }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
          if ((event.target as HTMLElement).tagName !== 'INPUT') return
          event.preventDefault()
          aplicarSiValido()
        }}
        noValidate
        role="search"
        aria-label="Filtros de clientes"
        className="mt-8 grid gap-5 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3"
      >
        <Field id="clientes-identificacion" label="Documento exacto">
          <Input id="clientes-identificacion" autoComplete="off" maxLength={13} placeholder="Cédula, RUC o pasaporte"
            className={fieldClassName} {...texto('identificacion')} />
        </Field>

        <Field id="clientes-nombre" label="Nombre o razón social">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input id="clientes-nombre" type="search" autoComplete="off" maxLength={NOMBRE_MAX}
              placeholder="Al menos 3 letras del inicio de un nombre o apellido" className={cn(fieldClassName, 'pl-12')}
              aria-describedby="clientes-busqueda-ayuda" {...texto('nombre')} />
          </div>
        </Field>

        <Field id="clientes-email" label="Correo exacto">
          <Input id="clientes-email" type="email" autoComplete="off" maxLength={150} placeholder="correo@dominio.ec"
            className={fieldClassName} {...texto('email')} />
        </Field>

        <Field id="clientes-estado" label="Estado">
          <select id="clientes-estado" className={selectClassName} value={filtros.estado}
            onChange={(event) => cambiar('estado', ESTADOS_CLIENTE.find((estado) => estado === event.target.value) ?? '')}>
            <option value="">Todos</option>
            {ESTADOS_CLIENTE.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </Field>

        <Field id="clientes-agencia" label="Agencia de registro">
          <select id="clientes-agencia" className={selectClassName} value={filtros.idAgenciaRegistro}
            onChange={(event) => cambiar('idAgenciaRegistro', event.target.value)}>
            <option value="">{agencias.isPending ? 'Cargando agencias…' : 'Todas'}</option>
            {agencias.data.map((agencia) => (
              <option key={agencia.idAgencia} value={agencia.idAgencia}>
                {agencia.idAgencia} · {agencia.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field id="clientes-tipo" label="Tipo de cliente">
          <select id="clientes-tipo" className={selectClassName} value={filtros.tipoCliente}
            onChange={(event) => cambiar('tipoCliente', TIPOS_CLIENTE.find((tipo) => tipo === event.target.value) ?? '')}>
            <option value="">Todos</option>
            {TIPOS_CLIENTE.map((tipo) => (
              <option key={tipo} value={tipo}>
                {TIPO_CLIENTE_LABEL[tipo]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="clientes-orden" label="Ordenar por">
          <select id="clientes-orden" className={selectClassName} value={filtros.sort}
            onChange={(event) => cambiar('sort', ORDENES.find((orden) => orden.value === event.target.value)?.value ?? ORDENES[0].value)}>
            {ORDENES.map((orden) => (
              <option key={orden.value} value={orden.value}>
                {orden.label}
              </option>
            ))}
          </select>
        </Field>

        <p id="clientes-busqueda-ayuda" className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
          Indica al menos un filtro (el tipo de cliente solo acota). La lista se actualiza al dejar de escribir o cambiar un filtro; Enter busca de inmediato.
        </p>
        {borrador.aviso && (
          <p role="status" className="flex items-center gap-2 text-sm text-heading sm:col-span-2 lg:col-span-3">
            <Info aria-hidden className="size-4 shrink-0" />
            {borrador.aviso}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end lg:col-span-3">
          {puedeExportar && (
            <Button type="button" variant="outline" className="h-[52px] rounded-xl px-6 text-base"
              disabled={!aplicada.params || exportacion.isPending}
              onClick={() => { if (aplicada.params) exportacion.mutate(aplicada.params) }}>
              <Download aria-hidden />
              {exportacion.isPending ? 'Preparando CSV…' : 'Exportar CSV'}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={limpiar} className="h-[52px] rounded-xl px-6 text-base">
            <RotateCcw />
            Limpiar
          </Button>
          <Button type="submit" disabled={borrador.aviso !== null} className="h-[52px] rounded-xl px-6 text-base">
            <Search aria-hidden />
            Buscar
          </Button>
        </div>
        {exportacion.isError && (
          <p role="alert" className="text-sm text-destructive sm:col-span-2 lg:col-span-3">{exportacion.error.message}</p>
        )}
      </form>

      <section aria-label="Resultados" className="mt-8" aria-busy={actualizando}>
        <p role="status" aria-atomic="true" className="mb-3 text-sm text-muted-foreground">
          {actualizando
            ? 'Actualizando resultados…'
            : consulta.isSuccess && aplicada.params
              ? `${consulta.data.total.toLocaleString('es-EC')} ${consulta.data.total === 1 ? 'cliente encontrado' : 'clientes encontrados'}`
              : ''}
        </p>
        {!aplicada.params ? (
          <div role="status" className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-12 text-center">
            <Search aria-hidden className="size-8 text-muted-foreground" />
            <p className="font-semibold text-heading">Escribe un filtro para buscar clientes</p>
            <p className="text-sm text-muted-foreground">Por seguridad no se listan todos los clientes.</p>
          </div>
        ) : consulta.isError ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm sm:flex-row sm:items-center"
          >
            <p className="flex flex-1 items-center gap-2 text-destructive">
              <CircleAlert className="size-4 shrink-0" />
              {consulta.error.message}
            </p>
            <Button type="button" variant="outline" onClick={() => void consulta.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : consulta.isPending ? (
          <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <LoaderCircle className="size-5 animate-spin" />
            Buscando clientes…
          </p>
        ) : (
          <Resultados
            pagina={consulta.data}
            cambiando={consulta.isPlaceholderData || actualizando}
            onCambiarPagina={irAPagina}
          />
        )}
      </section>
    </div>
  )
}

interface ResultadosProps {
  pagina: PaginaClientes
  /** Mientras llega otra página se sigue viendo la anterior */
  cambiando: boolean
  onCambiarPagina: (page: number) => void
}

function Resultados({ pagina, cambiando, onCambiarPagina }: ResultadosProps) {
  const { items, page, pageSize, total } = pagina
  const paginas = totalPaginas(total, pageSize)

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <div
          role="status"
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-6 py-12 text-center"
        >
          <SearchX className="size-8 text-muted-foreground" />
          <p className="font-semibold text-heading">No se encontraron clientes con esos filtros</p>
          <p className="text-sm text-muted-foreground">Revisa lo que escribiste o limpia los filtros.</p>
        </div>
      ) : (
        <div
          aria-busy={cambiando}
          className={cn(
            'overflow-x-auto rounded-2xl border border-border bg-card transition-opacity',
            cambiando && 'opacity-60',
          )}
        >
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Clientes encontrados</caption>
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Cliente
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Identificación
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Tipo
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Estado
                </th>
                <th scope="col" className="w-12 px-5 py-3">
                  <span className="sr-only">Abrir ficha</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((cliente) => (
                <tr key={cliente.idCliente} className="relative transition-colors hover:bg-muted/60">
                  <td className="px-5 py-4">
                    {/* El enlace cubre toda la fila (after:inset-0) */}
                    <Link
                      to={`/clientes-busqueda/${cliente.idCliente}`}
                      className="font-semibold text-heading outline-none after:absolute after:inset-0 after:rounded-sm focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
                    >
                      {nombreVisible(cliente)}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground tabular-nums">{cliente.identificacion}</td>
                  <td className="px-5 py-4 text-muted-foreground">{TIPO_CLIENTE_LABEL[cliente.tipoCliente]}</td>
                  <td className="px-5 py-4">
                    <Badge variant={varianteEstado(cliente.estado)}>{cliente.estado}</Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ChevronRight aria-hidden className="ml-auto size-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <nav aria-label="Paginación" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite" className="text-sm text-muted-foreground">
            Página {page} de {paginas} · {total.toLocaleString('es-EC')} {total === 1 ? 'resultado' : 'resultados'}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={cambiando || page <= 1}
              onClick={() => onCambiarPagina(page - 1)}
              className="h-10 rounded-xl px-4"
            >
              <ChevronLeft />
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={cambiando || page >= paginas}
              onClick={() => onCambiarPagina(page + 1)}
              className="h-10 rounded-xl px-4"
            >
              Siguiente
              <ChevronRight />
            </Button>
          </div>
        </nav>
      )}
    </div>
  )
}
