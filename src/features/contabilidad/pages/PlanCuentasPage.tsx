import { useDeferredValue, useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Cargando, Checkbox, Input, Label } from '@/shared/ui'
import { hasAnyRole, useAuthStore } from '@/features/auth'
import { CONTABILIDAD_ROLES } from '@/features/contabilidad/api/contabilidad.contract'
import { ArbolCuentas } from '@/features/contabilidad/components/ArbolCuentas'
import { DetalleCuenta } from '@/features/contabilidad/components/DetalleCuenta'
import { usePlanCuentas } from '@/features/contabilidad/hooks/usePlanCuentas'
import { construirArbol, filtrarArbol, idsPrimerNivel, normalizar } from '@/features/contabilidad/lib/arbol'
import { mensajeErrorPlanCuentas } from '@/features/contabilidad/lib/mensajes'

/** Ramas abiertas a mano para un filtro concreto; al cambiar el filtro se vuelve a lo de partida */
interface Abiertos {
  clave: string
  ids: ReadonlySet<number>
}

/** E2-02 · Plan de cuentas (CON-03): CONTADOR, AUDITOR y ADMIN consultan */
export function PlanCuentasPage() {
  const roles = useAuthStore((state) => state.user?.roles) ?? []
  const puedeMantener = hasAnyRole(roles, CONTABILIDAD_ROLES.mantener)

  const plan = usePlanCuentas()
  const arbol = useMemo(() => construirArbol(plan.data ?? []), [plan.data])

  const [texto, setTexto] = useState('')
  const [soloImputables, setSoloImputables] = useState(false)
  const textoDiferido = useDeferredValue(texto)
  const filtro = useMemo(
    () => filtrarArbol(arbol.raices, { texto: textoDiferido, soloImputables }),
    [arbol.raices, textoDiferido, soloImputables],
  )

  const clave = `${normalizar(textoDiferido)}|${soloImputables}`
  const [abiertosManual, setAbiertosManual] = useState<Abiertos | null>(null)
  const abiertosBase = useMemo(() => filtro?.abiertos ?? idsPrimerNivel(arbol.raices), [filtro, arbol.raices])
  const abiertos = abiertosManual?.clave === clave ? abiertosManual.ids : abiertosBase

  const alternar = (id: number, abrir: boolean) => {
    const ids = new Set(abiertos)
    if (abrir) ids.add(id)
    else ids.delete(id)
    setAbiertosManual({ clave, ids })
  }

  const [seleccionada, setSeleccionada] = useState<number | null>(null)
  const nodo = seleccionada === null ? undefined : arbol.porId.get(seleccionada)
  const padre = nodo?.idPadre == null ? undefined : arbol.porId.get(nodo.idPadre)

  const contenido = (() => {
    if (plan.isError) {
      return (
        <Aviso tono="error">
          {mensajeErrorPlanCuentas(toApiError(plan.error), 'consulta')}
          <Button variant="outline" size="sm" onClick={() => plan.refetch()} className="w-fit">
            Reintentar
          </Button>
        </Aviso>
      )
    }
    if (plan.isPending) return <Cargando texto="Cargando el plan de cuentas…" />
    if (arbol.raices.length === 0) return <Aviso>Todavía no hay cuentas en el plan.</Aviso>
    if (filtro && filtro.coincidencias.size === 0) {
      return <Aviso>Ninguna cuenta coincide con la búsqueda. Prueba con otro código o nombre.</Aviso>
    }
    return (
      <ArbolCuentas
        raices={arbol.raices}
        abiertos={abiertos}
        visibles={filtro?.visibles ?? null}
        coincidencias={filtro?.coincidencias ?? null}
        seleccionada={seleccionada}
        onAlternar={alternar}
        onSeleccionar={setSeleccionada}
      />
    )
  })()

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <header>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Plan de cuentas</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Catálogo de cuentas contables de la cooperativa. Busca una cuenta por código o nombre y revisa su saldo
          {puedeMantener ? ', o crea y mantén las subcuentas propias.' : '. Tienes acceso de solo consulta.'}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label="Cuentas" className="flex min-w-0 flex-col gap-5 rounded-3xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative min-w-60 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Buscar por código o nombre"
                placeholder="Buscar por código o nombre"
                value={texto}
                onChange={(evento) => setTexto(evento.target.value)}
                maxLength={100}
                className="h-11 rounded-xl border-border bg-field pl-9 text-base md:text-base dark:bg-field"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="solo-imputables" checked={soloImputables} onCheckedChange={(valor) => setSoloImputables(valor === true)} />
              <Label htmlFor="solo-imputables" className="text-sm text-heading">
                Solo imputables
              </Label>
            </div>
          </div>
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {filtro && filtro.coincidencias.size > 0 &&
              `${filtro.coincidencias.size} ${filtro.coincidencias.size === 1 ? 'cuenta coincide' : 'cuentas coinciden'}`}
          </p>
          {contenido}
        </section>

        <aside aria-label="Detalle de la cuenta" className="h-fit rounded-3xl border border-border bg-card p-6 lg:sticky lg:top-6">
          {nodo ? (
            <DetalleCuenta nodo={nodo} padre={padre} />
          ) : (
            <p className="text-sm text-muted-foreground">Elige una cuenta del árbol para ver su detalle.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
