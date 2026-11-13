import { Link } from 'react-router'
import { ChevronLeft, ChevronRight, CircleAlert, LoaderCircle, RotateCcw, Search, SearchX } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Badge, Button, Input } from '@/shared/ui'
import { ESTADOS_CLIENTE, TIPOS_CLIENTE, type PaginaClientes } from '@/features/clientes/api/clientes.contract'
import { Field, fieldClassName } from '@/features/clientes/components/form-fields'
import { useBuscarClientes } from '@/features/clientes/hooks/useConsultaClientes'
import { useFiltrosClientes } from '@/features/clientes/hooks/useFiltrosClientes'
import {
  armarParametros,
  nombreVisible,
  ORDENES,
  Q_MAX,
  TIPO_CLIENTE_LABEL,
  totalPaginas,
  varianteEstado,
} from '@/features/clientes/lib/consulta'

/*
 * C-03 · Búsqueda y listado de clientes (CLI-03).
 *
 * Los filtros viven en el estado del componente, no en la URL: la identificación y los nombres
 * no deben quedar en el historial de navegación. La API conserva su contrato GET;
 * los logs de infraestructura requieren su propia política de protección de datos.
 */

const selectClassName = cn(
  fieldClassName,
  'w-full border text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:scheme-dark',
)

export function BuscarClientesPage() {
  const { filtros, busqueda, cambiar, limpiar, buscar, irAPagina, iniciarComposicion, terminarComposicion } = useFiltrosClientes()
  const consulta = useBuscarClientes(armarParametros(busqueda.filtros, busqueda.page))
  const esperandoTexto = filtros.q.trim() !== busqueda.filtros.q.trim()
    || filtros.identificacion.trim() !== busqueda.filtros.identificacion.trim()
  const actualizando = esperandoTexto || consulta.isFetching

  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Consultar clientes</h1>
      <p className="mt-2 text-base text-muted-foreground">
        Busca por nombre, razón social o identificación y abre la ficha del cliente que atiendes.
      </p>

      <form
        onSubmit={(event) => { event.preventDefault(); buscar() }}
        noValidate
        role="search"
        aria-label="Filtros de clientes"
        className="mt-8 grid gap-5 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3"
      >
        <Field id="clientes-q" label="Buscar" className="lg:col-span-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="clientes-q"
              type="search"
              autoComplete="off"
              maxLength={Q_MAX}
              placeholder="Un nombre, un apellido, la razón social o parte de la identificación"
              className={cn(fieldClassName, 'pl-12')}
              value={filtros.q}
              onChange={(event) => cambiar('q', event.target.value)}
              onCompositionStart={iniciarComposicion}
              onCompositionEnd={(event) => terminarComposicion('q', event.currentTarget.value)}
              aria-describedby="clientes-busqueda-ayuda"
            />
          </div>
        </Field>

        <Field id="clientes-identificacion" label="Identificación exacta">
          <Input
            id="clientes-identificacion"
            autoComplete="off"
            maxLength={13}
            placeholder="Cédula, RUC o pasaporte"
            className={fieldClassName}
            value={filtros.identificacion}
            onChange={(event) => cambiar('identificacion', event.target.value)}
            onCompositionStart={iniciarComposicion}
            onCompositionEnd={(event) => terminarComposicion('identificacion', event.currentTarget.value)}
          />
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
          La lista se actualiza al dejar de escribir o cambiar un filtro. Buscar o Enter aplica la búsqueda inmediatamente.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end lg:col-span-3">
          <Button type="button" variant="outline" onClick={limpiar} className="h-[52px] rounded-xl px-6 text-base">
            <RotateCcw />
            Limpiar
          </Button>
          <Button type="submit" className="h-[52px] rounded-xl px-8 text-base font-semibold hover:bg-primary/90">
            <Search />
            Buscar
          </Button>
        </div>
      </form>

      <section aria-label="Resultados" className="mt-8" aria-busy={actualizando}>
        <p role="status" aria-atomic="true" className="mb-3 text-sm text-muted-foreground">
          {actualizando
            ? 'Actualizando resultados…'
            : consulta.isSuccess
              ? `${consulta.data.total.toLocaleString('es-EC')} ${consulta.data.total === 1 ? 'cliente encontrado' : 'clientes encontrados'}`
              : ''}
        </p>
        {consulta.isError ? (
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
