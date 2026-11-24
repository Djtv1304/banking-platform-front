import { z } from 'zod'

/*
 * Contrato de la consulta de saldo y cuenta (A-02) en camelCase.
 *
 * - CTA-02 GET /cuentas?idCliente&numeroCuenta&estado&idAgencia&page&pageSize → búsqueda paginada, sin saldos
 * - CTA-03 GET /cuentas/{idCuenta}       → detalle de la cuenta en cualquier estado
 * - CTA-04 GET /cuentas/{idCuenta}/saldo → saldo, retenido y disponible (los tres en 0 si está CERRADA)
 * - CLI-03 GET /clientes?identificacion=… → el `idCliente` para filtrar por cliente
 *
 * Roles: ASESOR, CAJERO, SUPERVISOR y ADMIN. Los filtros de CTA-02 son de igualdad exacta e
 * `idAgencia` debe tener exactamente 3 caracteres (otro largo → 400). El dinero llega como
 * number JSON. Los esquemas solo describen los campos que usa la pantalla; zod descarta el resto.
 */

const BASE = '/api/v1'

export const CUENTAS_ENDPOINTS = {
  buscar: `${BASE}/cuentas`,
  detalle: (idCuenta: number) => `${BASE}/cuentas/${idCuenta}`,
  saldo: (idCuenta: number) => `${BASE}/cuentas/${idCuenta}/saldo`,
  clientes: `${BASE}/clientes`,
} as const

export const ESTADOS_CUENTA = ['ACTIVA', 'INACTIVA', 'BLOQUEADA', 'CERRADA', 'PendienteDeposito', 'Anulada'] as const

export const estadoCuentaSchema = z.enum(ESTADOS_CUENTA)

export const pageSchema = <T extends z.ZodType>(item: T) => z.object({ items: z.array(item), total: z.number() })

/** CLI-03 · Solo hace falta el id para filtrar las cuentas */
export const clienteSchema = z.object({ idCliente: z.number() })

/**
 * CTA-02 (cada fila) y CTA-03. CTA-03 también trae `idMoneda`, `saldo` y `saldoRetenido`, pero no
 * se leen: los saldos se muestran solo desde CTA-04, porque en una cuenta CERRADA CTA-03 trae los
 * importes guardados y CTA-04 los trae en 0.
 */
export const cuentaSchema = z.object({
  idCuenta: z.number(),
  numeroCuenta: z.string(),
  idCliente: z.number(),
  idProducto: z.number(),
  idAgencia: z.string(),
  tipoCuenta: z.enum(['Ahorro', 'Corriente']),
  estado: estadoCuentaSchema,
})

/** CTA-04 · El disponible lo calcula el backend (saldo − retenido); `fechaConsulta` es ISO en UTC */
export const saldoCuentaSchema = z.object({
  idCuenta: z.number(),
  saldo: z.number(),
  saldoRetenido: z.number(),
  saldoDisponible: z.number(),
  fechaConsulta: z.string(),
})

export type EstadoCuenta = z.infer<typeof estadoCuentaSchema>
export type Cuenta = z.infer<typeof cuentaSchema>
export type SaldoCuenta = z.infer<typeof saldoCuentaSchema>
