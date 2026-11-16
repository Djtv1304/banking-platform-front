import { z } from 'zod'

/*
 * Contrato de los asientos contables (E4-02) en camelCase.
 *
 * - CON-04 GET /contabilidad/asientos?fecha&origen&idAgencia&estado&page&pageSize&sort
 * - CON-05 GET /contabilidad/asientos/{idAsiento}
 *
 * Roles: CONTADOR, AUDITOR y ADMIN. Todavía no están desplegados (PR #392 del backend): mientras
 * no lo estén, el servidor responde 404/405/501 y la SPA lo muestra como «todavía no disponible».
 * El dinero es `Money`: llega como número JSON. En CON-04 `detalle` va vacío; las líneas salen de
 * CON-05. `origen` y `estado` son texto libre en el backend (pueden aparecer valores nuevos), por
 * eso el esquema acepta cualquier texto y las listas de abajo solo alimentan los filtros.
 */

const BASE = '/api/v1/contabilidad/asientos'

export const ASIENTOS_ENDPOINTS = {
  asientos: BASE,
  asiento: (idAsiento: number) => `${BASE}/${idAsiento}`,
} as const

/** Máximo de filas por página que acepta el backend */
export const ASIENTOS_PAGE_SIZE = 20

/** Valores que hoy admite la base de datos (CK_AsientoContable_Origen / _Estado) */
export const ORIGENES_ASIENTO = [
  'AJUSTE',
  'ATM',
  'BOVEDA',
  'CAJA',
  'CIERRE',
  'CREDITO',
  'CUENTAS',
  'MANUAL',
  'NOMINA',
  'TARJETA',
  'TRANSACCIONES',
] as const

export const ESTADOS_ASIENTO = ['BORRADOR', 'PENDIENTE_APROBACION', 'CONTABILIZADO', 'REVERSADO', 'ANULADO'] as const

/** Campos por los que CON-04 acepta `sort` (`repository.ORDEN_ASIENTOS`) */
export type CampoOrdenAsiento = 'fechaAsiento' | 'numeroAsiento' | 'idAsientoContable' | 'totalDebito' | 'estado' | 'origen'

export const movimientoAsientoSchema = z.object({
  idMovimientoContable: z.number(),
  idCuentaContable: z.number(),
  codigoCuenta: z.string(),
  /** «DEBITO» o «CREDITO» */
  tipoMovimiento: z.string(),
  monto: z.number(),
  idTransaccion: z.number().nullable(),
  idAgencia: z.string().nullable(),
})

export const asientoSchema = z.object({
  idAsientoContable: z.number(),
  numeroAsiento: z.string(),
  /** Día contable `YYYY-MM-DD`, sin hora */
  fechaAsiento: z.string(),
  idTipoAsiento: z.number(),
  origen: z.string(),
  concepto: z.string(),
  totalDebito: z.number(),
  totalCredito: z.number(),
  estado: z.string(),
  /** Id del asiento que lo reversó; null si no está reversado */
  idAsientoReversion: z.number().nullable(),
  idAgencia: z.string(),
  detalle: z.array(movimientoAsientoSchema),
})

export const paginaAsientosSchema = z.object({
  items: z.array(asientoSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

export type MovimientoAsiento = z.infer<typeof movimientoAsientoSchema>
export type Asiento = z.infer<typeof asientoSchema>
export type PaginaAsientos = z.infer<typeof paginaAsientosSchema>
