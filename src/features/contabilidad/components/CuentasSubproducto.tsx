import { toApiError } from '@/shared/api'
import { Aviso, Cargando } from '@/shared/ui'
import { useCuentasSubproducto } from '@/features/contabilidad/hooks/useCuentasProducto'
import { descripcionClase } from '@/features/contabilidad/lib/cuentas-producto'

const ORIGEN = { TIPO: 'del tipo', PRODUCTO: 'del producto', SUBPRODUCTO: 'propia' } as const

/** E3-05 · Cuentas contables que se aplican al subproducto y de qué nivel vienen (solo consulta) */
export function CuentasSubproducto({ idSubProducto }: { idSubProducto: number }) {
  const cuentas = useCuentasSubproducto(idSubProducto)
  if (cuentas.isError) return <Aviso tono="error">{toApiError(cuentas.error).message}</Aviso>
  if (cuentas.isPending) return <Cargando texto="Cargando cuentas contables…" />
  const { roles, faltantes, aviso, tipoTarjeta } = cuentas.data
  // La cartera tiene 45 cuentas (situación × condición × tramo): en la ficha va resumida
  const principales = roles.filter((r) => r.codigoRol !== 'CARTERA')
  const cartera = roles.filter((r) => r.codigoRol === 'CARTERA')

  return (
    <section aria-label="Cuentas contables" className="flex flex-col gap-2 break-inside-avoid sm:col-span-2">
      <h2 className="text-base font-semibold text-heading">Cuentas contables</h2>
      {aviso && <Aviso>{aviso}</Aviso>}
      {tipoTarjeta === 'Debito' && (
        <p className="text-sm text-muted-foreground">La tarjeta de débito mueve el capital de la cuenta de ahorro vinculada.</p>
      )}
      {faltantes.length > 0 && (
        <Aviso tono="error">Faltan cuentas para: {faltantes.join(', ')}. El subproducto no se puede activar hasta asignarlas.</Aviso>
      )}
      <ul className="flex flex-col gap-1 text-sm text-heading">
        {principales.map((r) => (
          <li key={r.idClase}>
            {descripcionClase(r)}:{' '}
            {r.cuenta ? (
              <>
                <span className="font-mono">{r.cuenta.codigoCuenta}</span> {r.cuenta.nombreCuenta}
                {r.origen && <span className="text-muted-foreground"> · {ORIGEN[r.origen]}</span>}
              </>
            ) : (
              <span className={r.requerido ? 'font-semibold text-destructive' : 'text-muted-foreground'}>{r.requerido ? 'sin cuenta' : 'no aplica'}</span>
            )}
          </li>
        ))}
        {cartera.length > 0 && (
          <li>
            Cartera: {cartera.filter((r) => r.cuenta).length} de {cartera.length} cuentas por situación, condición y tramo (
            {[...new Set(cartera.map((r) => r.cuentaBase.slice(0, 4)))].join(', ')})
          </li>
        )}
      </ul>
    </section>
  )
}
