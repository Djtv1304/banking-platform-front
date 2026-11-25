import { z } from 'zod'

/*
 * Contrato de los asientos contables (E4-02) en camelCase.
 *
 * - CON-04 GET /contabilidad/asientos?fecha&origen&idAgencia&estado&page&pageSize&sort
 * - CON-05 GET /contabilidad/asientos/{idAsiento}
 *
 * Roles: CONTADOR, AUDITOR y ADMIN. Están en develop del backend; si un entorno aún no los tiene,
 * el servidor responde 404/405/501 y la SPA lo muestra como «todavía no disponible».
 * El dinero es `Money`: llega como número JSON. En CON-04 `detalle` va vacío; las líneas salen de
 * CON-05. `origen` y `estado` son texto libre en el backend (pueden aparecer valores nuevos), por
 * eso el esquema acepta cualquier texto y las listas de abajo solo alimentan los filtros.
 */

const BASE = '/api/v1/contabilidad/asientos'

export const ASIENTOS_ENDPOINTS = {
  asientos: BASE,
  asiento: (idAsiento: number) => `${BASE}/${idAsiento}`,
  /** E4-04 (propuesto) · 202 = enviado a aprobación */
  envio: (idAsiento: number) => `${BASE}/${idAsiento}/envio`,
  /** E4-04 (propuesto) · sólo borradores */
  anulacion: (idAsiento: number) => `${BASE}/${idAsiento}/anulacion`,
  /** E4-04 (propuesto) · 202 = el reverso queda pendiente de aprobación */
  reverso: (idAsiento: number) => `${BASE}/${idAsiento}/reverso`,
} as const

/*
 * E4-04 · Asientos manuales (contrato PROPUESTO por el front; el backend aún no lo tiene en develop).
 *
 * - POST /contabilidad/asientos                 AsientoManual → 201 { idAsientoContable } en BORRADOR
 * - PUT  /contabilidad/asientos/{id}            AsientoManual → 200 (sólo BORRADOR; si no, 409 ASIENTO_NO_EDITABLE)
 * - POST /contabilidad/asientos/{id}/envio      → 202: queda PENDIENTE_APROBACION en /aprobaciones
 * - POST /contabilidad/asientos/{id}/anulacion  { motivo } → 200 ANULADO (sólo BORRADOR)
 * - POST /contabilidad/asientos/{id}/reverso    { motivo } → 202 (sólo CONTABILIZADO y manual; si no, 409 ASIENTO_DE_OPERACION)
 *
 * La fecha la pone el servidor (fecha contable vigente) y el tipo de asiento también (el manual).
 * Funciones: contabilidad.asientos.crear y contabilidad.asientos.reversar (CON-ASIENTO-CREAR / CON-ASIENTO-REVERSO).
 */

/** Largo máximo del concepto (propuesto; el backend tiene la última palabra con 422) */
export const CONCEPTO_ASIENTO_MAXIMO = 200
export const CONCEPTO_ASIENTO_MINIMO = 5

export interface AsientoManual {
  concepto: string
  idAgencia: string
  lineas: { idCuentaContable: number; tipoMovimiento: 'DEBITO' | 'CREDITO'; monto: number }[]
}

export const asientoCreadoSchema = z.object({ idAsientoContable: z.number() })

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
  /**
   * Solo el asiento de REVERSO lo trae: es el id del asiento original que reversa. El original
   * (estado REVERSADO) y el resto lo traen en null.
   */
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
