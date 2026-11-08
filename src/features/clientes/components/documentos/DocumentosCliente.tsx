import { useState, type ReactNode } from 'react'
import { Download, Eye, FileImage, FileText, Files, Search } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Button, Input } from '@/shared/ui'
import type { CategoriaDocumento, DocumentoCliente } from '@/features/clientes/api/clientes.contract'
import { CATEGORIAS_DOCUMENTO, formatearFecha, formatearTamano } from '@/features/clientes/lib/documentos'

type Filtro = CategoriaDocumento | 'TODOS'

const normalizar = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

interface DocumentosClienteProps {
  documentos: DocumentoCliente[] | undefined
  isPending: boolean
  isError: boolean
  descripcion: string
  /** Acción del encabezado (p. ej. "Subir documento" para el personal) */
  accion?: ReactNode
  /** El personal ve quién cargó cada documento; el cliente no */
  mostrarCargadoPor?: boolean
}

export function DocumentosCliente({
  documentos = [],
  isPending,
  isError,
  descripcion,
  accion,
  mostrarCargadoPor = false,
}: DocumentosClienteProps) {
  const [filtro, setFiltro] = useState<Filtro>('TODOS')
  const [busqueda, setBusqueda] = useState('')

  const coincidentes = documentos.filter((documento) =>
    normalizar(`${documento.nombre} ${documento.referencia ?? ''}`).includes(normalizar(busqueda.trim())),
  )
  const contar = (categoria: Filtro) =>
    categoria === 'TODOS' ? coincidentes.length : coincidentes.filter((d) => d.categoria === categoria).length

  // En "Todos" se agrupan por categoría (solo las que tienen documentos); si no, solo la elegida
  const grupos = CATEGORIAS_DOCUMENTO.filter((categoria) => filtro === 'TODOS' || categoria.value === filtro)
    .map((categoria) => ({
      ...categoria,
      documentos: coincidentes
        .filter((documento) => documento.categoria === categoria.value)
        .sort((a, b) => b.fechaCarga.localeCompare(a.fechaCarga)),
    }))
    .filter((grupo) => filtro !== 'TODOS' || grupo.documentos.length > 0)

  const opciones = [
    { value: 'TODOS' as const, label: 'Todos', Icon: Files },
    ...CATEGORIAS_DOCUMENTO.map(({ value, label, Icon }) => ({ value, label, Icon })),
  ]

  return (
    <section aria-labelledby="documentos-titulo" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="documentos-titulo" className="text-xl font-semibold text-heading">
            Documentos
          </h2>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
        {accion}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Categorías: lista vertical en escritorio, fila desplazable en móvil */}
        <nav aria-label="Categorías de documentos">
          <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:flex-col lg:overflow-visible">
            {opciones.map(({ value, label, Icon }) => {
              const activo = filtro === value
              const total = contar(value)
              return (
                <li key={value} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setFiltro(value)}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      activo ? 'bg-primary/12 text-heading' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className={cn('size-[18px] shrink-0', activo && 'text-link')} />
                    <span className="flex-1">{label}</span>
                    <span
                      className={cn(
                        'min-w-6 rounded-full px-1.5 text-center text-xs tabular-nums',
                        activo ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                        total === 0 && !activo && 'opacity-60',
                      )}
                    >
                      {isPending ? '–' : total}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre o producto"
              aria-label="Buscar documentos"
              className="h-11 rounded-xl border-border bg-field pl-10 dark:bg-field"
            />
          </div>

          {isPending && (
            <div className="flex flex-col gap-2" aria-busy="true">
              {[0, 1, 2].map((fila) => (
                <div key={fila} className="flex items-center gap-4 rounded-xl border border-border p-3">
                  <span className="size-10 animate-pulse rounded-lg bg-muted" />
                  <span className="flex flex-1 flex-col gap-2">
                    <span className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                    <span className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </span>
                </div>
              ))}
            </div>
          )}

          {isError && <p className="text-sm text-destructive">No pudimos cargar los documentos.</p>}

          {!isPending && !isError && grupos.length === 0 && (
            <EstadoVacio mensaje={busqueda ? 'Ningún documento coincide con la búsqueda.' : 'Aún no hay documentos.'} />
          )}

          {!isPending &&
            !isError &&
            grupos.map((grupo) => (
              <div key={grupo.value} className="flex flex-col gap-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-heading">
                    <grupo.Icon className="size-4 text-muted-foreground" />
                    {grupo.label}
                  </h3>
                  <span className="hidden text-xs text-muted-foreground sm:block">{grupo.descripcion}</span>
                </div>

                {grupo.documentos.length === 0 ? (
                  <EstadoVacio mensaje={`No hay documentos de ${grupo.label.toLowerCase()}.`} />
                ) : (
                  <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                    {grupo.documentos.map((documento) => (
                      <DocumentoFila key={documento.idDocumento} documento={documento} mostrarCargadoPor={mostrarCargadoPor} />
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </div>
      </div>
    </section>
  )
}

function DocumentoFila({ documento, mostrarCargadoPor }: { documento: DocumentoCliente; mostrarCargadoPor: boolean }) {
  const esImagen = documento.formato !== 'PDF'
  const Icono = esImagen ? FileImage : FileText
  const detalles = [
    `${documento.formato} · ${formatearTamano(documento.tamanoBytes)}`,
    formatearFecha(documento.fechaCarga),
    mostrarCargadoPor && `Cargado por ${documento.cargadoPor}`,
  ].filter(Boolean)

  return (
    <li className="flex items-center gap-4 p-3 sm:px-4">
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          esImagen ? 'bg-info/20 text-foreground' : 'bg-destructive/12 text-destructive',
        )}
      >
        <Icono className="size-5" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium text-heading">{documento.nombre}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {detalles.join(' · ')}
          {documento.referencia && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">{documento.referencia}</span>
          )}
        </span>
      </div>

      {/* TODO(API): abrir y descargar con la URL firmada que entregue el backend para cada documento */}
      <div className="flex shrink-0 items-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Ver ${documento.nombre}`}>
          <Eye />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Descargar ${documento.nombre}`}>
          <Download />
        </Button>
      </div>
    </li>
  )
}

function EstadoVacio({ mensaje }: { mensaje: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
      {mensaje}
    </p>
  )
}
