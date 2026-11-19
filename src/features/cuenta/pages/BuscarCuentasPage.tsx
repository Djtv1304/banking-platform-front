import { useState } from 'react'
import { Link } from 'react-router'

import { Paginacion, ErrorApi } from '@/shared/ui'
import type { Cuenta } from '@/features/cuenta/api/cuentas.contract'
import { Aviso, Cargando } from '@/features/cuenta/components/Aviso'
import { EstadoCuentaBadge } from '@/features/cuenta/components/EstadoCuentaBadge'
import { FiltrosCuentas } from '@/features/cuenta/components/FiltrosCuentas'
import { useBuscarCuentas, useIdCliente, useNombresCuenta } from '@/features/cuenta/hooks/useCuentas'
import {
  armarParametros,
  FILTROS_VACIOS,
  resumenPaginacion,
  totalPaginas,
  type FiltrosCuentas as Filtros,
} from '@/features/cuenta/lib/filtros'

/** CTA-02 · Búsqueda de cuentas; sin filtros lista la primera página */
export function BuscarCuentasPage() {
  // Los filtros quedan en memoria, no en la URL: las identificaciones no deben ir al historial
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS)
  const [page, setPage] = useState(1)

  const identificacion = filtros.identificacion || undefined
  const cliente = useIdCliente(identificacion)
  const idCliente = cliente.data ?? undefined
  // Con filtro de cliente, CTA-02 espera a tener su id; si no existe, no se llama
  const cuentas = useBuscarCuentas(armarParametros(filtros, idCliente, page), !identificacion || idCliente !== undefined)

  const buscar = (nuevos: Filtros) => {
    setFiltros(nuevos)
    setPage(1)
  }

  const resultado = (() => {
    if (cliente.isError) return <ErrorApi error={cliente.error} />
    if (cliente.isLoading) return <Cargando texto="Buscando al cliente…" />
    if (identificacion && cliente.data === null) return <Aviso>No hay un cliente con esa identificación.</Aviso>
    if (cuentas.isError) return <ErrorApi error={cuentas.error} />
    if (cuentas.isPending) return <Cargando texto="Buscando cuentas…" />
    if (cuentas.data.items.length === 0) return <Aviso>No se encontraron cuentas con esos filtros.</Aviso>

    const { items, total } = cuentas.data
    return (
      <div className="flex flex-col gap-4">
        <TablaCuentas cuentas={items} />
        <Paginacion
          resumen={resumenPaginacion(page, total)}
          page={page}
          totalPaginas={totalPaginas(total)}
          ocupado={cuentas.isFetching}
          onCambiar={setPage}
        />
      </div>
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Consultar cuentas</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Busca cuentas por número, cliente, estado o agencia. Los filtros se combinan y comparan valores exactos.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 not-dark:shadow-xl not-dark:shadow-brand-ink/5 sm:p-8">
        <FiltrosCuentas buscando={cliente.isFetching || cuentas.isFetching} onBuscar={buscar} />
      </section>

      <section aria-label="Resultados" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        {resultado}
      </section>
    </div>
  )
}

function TablaCuentas({ cuentas }: { cuentas: Cuenta[] }) {
  const nombres = useNombresCuenta()

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-3 font-medium">
              Número
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Tipo
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Producto
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Agencia
            </th>
            <th scope="col" className="px-3 py-3 font-medium">
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {cuentas.map((cuenta) => (
            // Toda la fila abre el detalle: el enlace del número la cubre con su ::after
            <tr key={cuenta.idCuenta} className="relative border-b border-border transition-colors hover:bg-muted/60">
              <td className="px-3 py-3">
                <Link
                  to={`/cuentas/${cuenta.idCuenta}`}
                  className="font-semibold text-link outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                >
                  {cuenta.numeroCuenta}
                </Link>
              </td>
              <td className="px-3 py-3 text-heading">{cuenta.tipoCuenta}</td>
              <td className="px-3 py-3 text-heading">{nombres.producto(cuenta.idProducto)}</td>
              <td className="px-3 py-3 text-heading">{nombres.agencia(cuenta.idAgencia)}</td>
              <td className="px-3 py-3">
                <EstadoCuentaBadge estado={cuenta.estado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
