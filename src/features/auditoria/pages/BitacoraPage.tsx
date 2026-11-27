import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Download } from 'lucide-react'

import { Button, ErrorApi, Input, Label, Paginacion } from '@/shared/ui'
import { hasAnyRole, hasPermission, PERMISOS, useAuthStore, usePermisos } from '@/features/auth'
import { buscarEventos, exportarEventos, obtenerTiposEvento } from '@/features/auditoria/api/auditoria.api'
import { TablaEventos } from '@/features/auditoria/components/TablaEventos'
import { aFiltros, esquemaFiltros, type Filtros, type FormularioFiltros } from '@/features/auditoria/lib/filtros'
import { fechaEcuador } from '@/features/auditoria/lib/presentacion'

const PAGE_SIZE = 25
const ROLES_EXPORTACION: readonly string[] = ['ADMIN', 'AUDITOR']
const MAX_FILAS_EXPORTACION = 1000

const CAMPOS: { nombre: keyof FormularioFiltros; etiqueta: string; tipo?: string }[] = [
  { nombre: 'usuario', etiqueta: 'Usuario (ID interno)', tipo: 'number' },
  { nombre: 'agencia', etiqueta: 'Agencia' },
  { nombre: 'tipoObjetivo', etiqueta: 'Tipo de objetivo' },
  { nombre: 'idObjetivo', etiqueta: 'ID del objetivo' },
  { nombre: 'origen', etiqueta: 'Origen (IP)' },
  { nombre: 'canal', etiqueta: 'Canal' },
  { nombre: 'correlacion', etiqueta: 'Correlación' },
  { nombre: 'idSolicitud', etiqueta: 'Solicitud de aprobación', tipo: 'number' },
]
const SELECT = 'h-9 rounded-xl border border-border bg-field px-3 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

/** E8-01 · Bitácora de auditoría: búsqueda con rango obligatorio, detalle y exportación limitada. */
export function BitacoraPage() {
  const roles = useAuthStore((state) => state.user?.roles) ?? []
  const permisos = usePermisos()
  const puedeExportar = hasAnyRole(roles, ROLES_EXPORTACION) && hasPermission(permisos, PERMISOS.organizacionExportar)
  const [filtros, setFiltros] = useState<Filtros | null>(null)
  const [page, setPage] = useState(1)

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormularioFiltros>({
    resolver: zodResolver(esquemaFiltros),
    defaultValues: {
      desde: fechaEcuador(-6), hasta: fechaEcuador(), usuario: '', agencia: '', modulo: '', codigoEvento: '', resultado: '',
      tipoObjetivo: '', idObjetivo: '', origen: '', canal: '', correlacion: '', idSolicitud: '',
    },
  })
  const tipos = useQuery({ queryKey: ['auditoria', 'tipos-evento'], queryFn: obtenerTiposEvento, staleTime: 5 * 60_000 })
  const busqueda = useQuery({
    queryKey: ['auditoria', 'busqueda', filtros, page],
    queryFn: () => buscarEventos({ ...filtros!, page, pageSize: PAGE_SIZE }),
    enabled: filtros !== null,
    gcTime: 0,
    retry: false,
  })
  const exportacion = useMutation({ mutationFn: (formato: 'csv' | 'pdf') => exportarEventos({ ...filtros!, formato }) })

  const modulo = useWatch({ control, name: 'modulo' })
  const modulos = [...new Set((tipos.data ?? []).map((t) => t.modulo))].sort()
  const codigos = (tipos.data ?? []).filter((t) => !modulo || t.modulo === modulo).map((t) => t.codigo).sort()
  const totalPaginas = busqueda.data ? Math.max(1, Math.ceil(busqueda.data.total / PAGE_SIZE)) : 1

  const buscar = handleSubmit((form) => {
    setPage(1)
    setFiltros(aFiltros(form))
    exportacion.reset()
  })

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Bitácora de auditoría</h1>
        <p className="text-muted-foreground">Las horas se muestran en hora de Ecuador; la bitácora las guarda en UTC. Cada consulta queda registrada.</p>
      </div>

      <form noValidate onSubmit={(e) => void buscar(e)} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(['desde', 'hasta'] as const).map((nombre) => (
            <div key={nombre} className="flex flex-col gap-1.5">
              <Label htmlFor={`aud-${nombre}`}>{nombre === 'desde' ? 'Desde' : 'Hasta'} (obligatorio)</Label>
              <Input id={`aud-${nombre}`} type="date" aria-invalid={!!errors[nombre]} {...register(nombre)} />
              {errors[nombre] && <p role="alert" className="text-xs text-destructive">{errors[nombre].message}</p>}
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aud-modulo">Módulo</Label>
            <select id="aud-modulo" className={SELECT} {...register('modulo')}>
              <option value="">Todos</option>
              {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aud-codigoEvento">Tipo de evento</Label>
            <select id="aud-codigoEvento" className={SELECT} {...register('codigoEvento')}>
              <option value="">Todos</option>
              {codigos.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="aud-resultado">Resultado</Label>
            <select id="aud-resultado" className={SELECT} {...register('resultado')}>
              <option value="">Todos</option>
              <option value="Exitoso">Exitoso</option>
              <option value="Fallido">Fallido</option>
            </select>
          </div>
          {CAMPOS.map(({ nombre, etiqueta, tipo }) => (
            <div key={nombre} className="flex flex-col gap-1.5">
              <Label htmlFor={`aud-${nombre}`}>{etiqueta}</Label>
              <Input id={`aud-${nombre}`} type={tipo} autoComplete="off" aria-invalid={!!errors[nombre]} {...register(nombre)} />
              {errors[nombre] && <p role="alert" className="text-xs text-destructive">{errors[nombre].message}</p>}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={busqueda.isFetching}>Buscar</Button>
          {puedeExportar && (
            <>
              {(['csv', 'pdf'] as const).map((formato) => (
                <Button
                  key={formato}
                  type="button"
                  variant="outline"
                  disabled={!busqueda.data || exportacion.isPending}
                  onClick={() => exportacion.mutate(formato)}
                >
                  <Download className="size-4" />
                  Exportar {formato.toUpperCase()}
                </Button>
              ))}
              <span className="text-xs text-muted-foreground">Exporta la última búsqueda, hasta {MAX_FILAS_EXPORTACION.toLocaleString('es-EC')} eventos.</span>
            </>
          )}
        </div>
      </form>

      {busqueda.isError && <ErrorApi error={busqueda.error} />}
      {exportacion.isError && <ErrorApi error={exportacion.error} />}
      {busqueda.isFetching && !busqueda.data && <p role="status">Buscando eventos…</p>}
      {busqueda.data && (
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
          {busqueda.data.items.length
            ? <TablaEventos eventos={busqueda.data.items} titulo="Resultados de la bitácora de auditoría" conAgencia />
            : <p role="status">No se encontraron eventos con los filtros indicados.</p>}
          <Paginacion
            resumen={`${busqueda.data.total} eventos · página ${page} de ${totalPaginas}`}
            page={page}
            totalPaginas={totalPaginas}
            ocupado={busqueda.isFetching}
            onCambiar={setPage}
          />
        </section>
      )}
    </div>
  )
}
