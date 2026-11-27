import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'

import { Button, ErrorApi, Input, InsigniaEstado, Label, Paginacion } from '@/shared/ui'
import { listarVerificaciones, verificarIntegridad } from '@/features/auditoria/api/auditoria.api'
import { fechaEcuador, textoResultado } from '@/features/auditoria/lib/presentacion'

const PAGE_SIZE = 20
const CLAVE = ['auditoria', 'verificaciones'] as const

/** E8-02 · Integridad de la bitácora: últimas verificaciones (nocturnas y manuales) y verificar un rango. */
export function IntegridadPage() {
  const cliente = useQueryClient()
  const [page, setPage] = useState(1)
  const [desde, setDesde] = useState(fechaEcuador(-1))
  const [hasta, setHasta] = useState(fechaEcuador(-1))
  const lista = useQuery({
    queryKey: [...CLAVE, page],
    queryFn: () => listarVerificaciones(page, PAGE_SIZE),
    gcTime: 0,
  })
  const verificar = useMutation({
    mutationFn: () => verificarIntegridad(desde, hasta),
    onSuccess: () => {
      setPage(1)
      void cliente.invalidateQueries({ queryKey: CLAVE })
    },
  })
  const rangoValido = Boolean(desde && hasta && hasta >= desde)
  const totalPaginas = lista.data ? Math.max(1, Math.ceil(lista.data.total / PAGE_SIZE)) : 1

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Integridad de la bitácora</h1>
        <p className="text-muted-foreground">
          Cada registro está encadenado al anterior con un hash. La verificación nocturna revisa el día anterior; aquí puedes
          verificar cualquier rango de hasta un año. Una ruptura indica la primera secuencia alterada o faltante y genera una alerta.
        </p>
      </div>

      <form
        noValidate
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card p-5"
        onSubmit={(e) => { e.preventDefault(); if (rangoValido) verificar.mutate() }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="int-desde">Desde</Label>
          <Input id="int-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="int-hasta">Hasta</Label>
          <Input id="int-hasta" type="date" value={hasta} aria-invalid={!rangoValido} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <Button type="submit" disabled={!rangoValido || verificar.isPending}>
          <ShieldCheck className="size-4" />
          {verificar.isPending ? 'Verificando…' : 'Verificar ahora'}
        </Button>
        {!rangoValido && <p role="alert" className="w-full text-xs text-destructive">Indica un rango válido: la fecha de fin no puede ser anterior a la de inicio.</p>}
      </form>

      {verificar.isError && <ErrorApi error={verificar.error} />}
      {verificar.data && (
        <p role="status" className="text-sm">
          Verificación #{verificar.data.idVerificacion} (secuencias {verificar.data.secuenciaDesde}–{verificar.data.secuenciaHasta}):{' '}
          <strong>{textoResultado(verificar.data)}</strong>
        </p>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold text-heading">Últimas verificaciones</h2>
        {lista.isPending && <p role="status">Cargando verificaciones…</p>}
        {lista.isError && <ErrorApi error={lista.error} reintentar={() => void lista.refetch()} />}
        {lista.data && (
          <>
            {lista.data.items.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Verificaciones de integridad de la bitácora</caption>
                  <thead>
                    <tr className="border-b border-border">
                      {['Fecha (UTC)', 'Secuencias', 'Resultado', 'Ejecutada por'].map((t) => <th key={t} scope="col" className="p-2">{t}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {lista.data.items.map((v) => (
                      <tr key={v.idVerificacion} className="border-b border-border">
                        <td className="p-2"><time dateTime={v.fechaUtc}>{v.fechaUtc.slice(0, 19).replace('T', ' ')}</time></td>
                        <td className="p-2">{v.secuenciaDesde}–{v.secuenciaHasta}</td>
                        <td className="p-2">
                          <InsigniaEstado tono={v.resultado === 'Integra' ? 'exito' : 'peligro'}>{textoResultado(v)}</InsigniaEstado>
                        </td>
                        <td className="p-2">{v.ejecutadaPor == null ? 'Tarea nocturna' : `Usuario ID ${v.ejecutadaPor}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p role="status">Todavía no hay verificaciones.</p>}
            <Paginacion
              resumen={`${lista.data.total} verificaciones · página ${page} de ${totalPaginas}`}
              page={page}
              totalPaginas={totalPaginas}
              ocupado={lista.isFetching}
              onCambiar={setPage}
            />
          </>
        )}
      </section>
    </div>
  )
}
