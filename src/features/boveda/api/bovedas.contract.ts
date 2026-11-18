import { z } from 'zod'

/*
 * Contrato del módulo de bóvedas (`/api/v1/boveda`) en camelCase.
 *
 * - BOV-01 GET  /bovedas?idAgencia&tipo
 * - BOV-02 GET  /bovedas/{idBoveda}
 * - BOV-03 GET  /bovedas/{idBoveda}/movimientos?tipoMovimiento&desde&hasta&page&pageSize&sort
 * - BOV-04 POST /bovedas/{idBoveda}/movimientos      (con cabecera Idempotency-Key)
 * - BOV-05 POST /bovedas/{idBoveda}/arqueos
 * - BOV-06 POST /arqueos/{idArqueoBoveda}/aprobacion (sin body)
 *
 * El dinero llega como number JSON. Las respuestas se validan en tiempo de ejecución porque un 200
 * no garantiza JSON (si `/api` no llega al backend, el hosting puede responder `index.html`).
 */

const BASE = '/api/v1/boveda'

export const BOVEDAS_ENDPOINTS = {
  listar: `${BASE}/bovedas`,
  detalle: (idBoveda: number) => `${BASE}/bovedas/${idBoveda}`,
  movimientos: (idBoveda: number) => `${BASE}/bovedas/${idBoveda}/movimientos`,
  arqueos: (idBoveda: number) => `${BASE}/bovedas/${idBoveda}/arqueos`,
  aprobacion: (idArqueoBoveda: number) => `${BASE}/arqueos/${idArqueoBoveda}/aprobacion`,
} as const

/** Valores del filtro `tipo` de BOV-01 */
export const TIPOS_BOVEDA = ['General', 'Mayor', 'Menor'] as const

/** Valores del filtro `tipoMovimiento` de BOV-03 */
export const TIPOS_MOVIMIENTO = [
  'Traslado',
  'ProvisionExterna',
  'EnvioExcedente',
  'AjusteFaltante',
  'AjusteSobrante',
  'DotacionCaja',
  'DevolucionCaja',
  'AbastecimientoATM',
  'RemanenteATM',
] as const

export const ID_AGENCIA_REGEX = /^\d{3}$/

/** Piezas de una denominación que hay en la bóveda */
export const denominacionBovedaSchema = z.object({
  idDenominacion: z.number(),
  cantidadActual: z.number(),
  valor: z.number(),
  subtotal: z.number(),
})

/**
 * `tipoBoveda` y `estado` se leen como texto: un valor nuevo del backend no debe tumbar la lista
 * (se muestra tal cual). `idBovedaSuperior` es null en la bóveda General.
 */
export const bovedaSchema = z.object({
  idBoveda: z.number(),
  codigoBoveda: z.string(),
  tipoBoveda: z.string(),
  idAgencia: z.string().nullable(),
  idBovedaSuperior: z.number().nullable(),
  limiteMaximo: z.number(),
  limiteMinimo: z.number(),
  saldoActual: z.number(),
  estado: z.string(),
  denominaciones: z.array(denominacionBovedaSchema),
  totalDesglose: z.number(),
})

export const movimientoBovedaSchema = z.object({
  idMovimiento: z.number(),
  idBoveda: z.number(),
  idBovedaContraparte: z.number().nullish(),
  tipoMovimiento: z.string(),
  /** «I» ingresa efectivo a la bóveda · «E» egresa */
  naturaleza: z.enum(['I', 'E']),
  monto: z.number(),
  saldoAnterior: z.number(),
  saldoPosterior: z.number(),
  autorizadoPor: z.number().nullish(),
  idUsuarioMovimiento: z.number().nullish(),
  idMovimientoRelacionado: z.number().nullish(),
  /** ISO con zona (`2026-10-14T17:15:00-05:00`) */
  fechaMovimiento: z.string(),
  observaciones: z.string().nullish(),
  idAsientoContable: z.number().nullish(),
  desglose: z
    .array(z.object({ idDenominacion: z.number(), cantidad: z.number() }))
    .nullish()
    .transform((valor) => valor ?? []),
})

export const paginaMovimientosBovedaSchema = z.object({
  items: z.array(movimientoBovedaSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
})

/** Mayor valor de una columna INT de SQL Server */
export const INT_MAX = 2_147_483_647

/** Piezas contadas o movidas de una denominación; solo se envían las que tienen cantidad */
export const piezaSchema = z.object({
  idDenominacion: z.number().int().positive(),
  cantidad: z.number().int().positive().max(INT_MAX),
})

const idPositivo = z.number().int().positive().max(INT_MAX)

/** TODO(API): confirmar el máximo de `observaciones` en BOV-04 y BOV-05 */
export const OBSERVACIONES_MAX = 500

/** BOV-04 · `idBovedaContraparte` solo aplica a los traslados */
export const registrarMovimientoSchema = z.strictObject({
  desglose: z.array(piezaSchema).min(1),
  tipoMovimiento: z.enum(TIPOS_MOVIMIENTO),
  idBovedaContraparte: idPositivo.optional(),
  autorizadoPor: idPositivo,
  observaciones: z.string().trim().min(1).max(OBSERVACIONES_MAX).optional(),
})

/** Valores de `tipoArqueo` en BOV-05 */
export const TIPOS_ARQUEO = ['Sorpresivo', 'Programado'] as const

/** BOV-05 · `desglose` es el conteo físico de cada denominación */
export const registrarArqueoSchema = z.strictObject({
  desglose: z.array(piezaSchema).min(1),
  tipoArqueo: z.enum(TIPOS_ARQUEO),
  idUsuarioTestigo: idPositivo,
  observaciones: z.string().trim().min(1).max(OBSERVACIONES_MAX).optional(),
})

/** Cabecera de BOV-04: el mismo valor en un reintento evita registrar el movimiento dos veces */
export const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_-]{1,64}$/

/** BOV-04 responde una lista: un traslado registra el egreso y el ingreso de cada bóveda */
export const movimientosRegistradosSchema = z
  .union([z.array(movimientoBovedaSchema).min(1), movimientoBovedaSchema])
  .transform((valor) => (Array.isArray(valor) ? valor : [valor]))

/** Estados de un arqueo: se registra y luego se aprueba (genera los ajustes) o se anula */
export const ESTADOS_ARQUEO = ['REGISTRADO', 'APROBADO', 'ANULADO'] as const

/** BOV-05 y BOV-06 · `diferencia` = físico − teórico (negativa = faltante) */
export const arqueoSchema = z.object({
  idArqueoBoveda: z.number(),
  idBoveda: z.number(),
  fechaHoraArqueo: z.string(),
  tipoArqueo: z.string(),
  idUsuarioArqueador: z.number().nullish(),
  idUsuarioTestigo: z.number().nullish(),
  estado: z.string(),
  idMovimientoAjuste: z.number().nullish(),
  idsMovimientosAjuste: z.array(z.number()).nullish().transform((valor) => valor ?? []),
  diferenciaPorDenominacion: z
    .array(z.object({ idDenominacion: z.number(), cantidad: z.number() }))
    .nullish()
    .transform((valor) => valor ?? []),
  observaciones: z.string().nullish(),
  saldoTeorico: z.number(),
  saldoFisico: z.number(),
  diferencia: z.number(),
  idUsuarioAprobador: z.number().nullish(),
  fechaHoraAprobacion: z.string().nullish(),
})

export type PiezaDesglose = z.infer<typeof piezaSchema>
export type RegistrarMovimiento = z.infer<typeof registrarMovimientoSchema>
export type TipoArqueo = (typeof TIPOS_ARQUEO)[number]
export type RegistrarArqueo = z.infer<typeof registrarArqueoSchema>
export type Arqueo = z.infer<typeof arqueoSchema>
export type TipoBoveda = (typeof TIPOS_BOVEDA)[number]
export type TipoMovimientoBoveda = (typeof TIPOS_MOVIMIENTO)[number]
export type DenominacionBoveda = z.infer<typeof denominacionBovedaSchema>
export type Boveda = z.infer<typeof bovedaSchema>
export type MovimientoBoveda = z.infer<typeof movimientoBovedaSchema>
export type PaginaMovimientosBoveda = z.infer<typeof paginaMovimientosBovedaSchema>
