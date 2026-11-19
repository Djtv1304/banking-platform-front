import { z } from 'zod'

const importe = z.union([z.string(), z.number()]).transform(String)
const comunes = { idSubProducto: z.number().int().positive(), vigenciaDesde: z.iso.date(), vigenciaHasta: z.iso.date().nullable(), idSolicitud: z.number().nullable(), responsable: z.string() }
export const condicionVigenciaSchema = z.object({ ...comunes, idCondicion: z.number(), estado: z.enum(['Pendiente', 'Programada', 'Vigente', 'Reemplazada', 'Cancelada']), montoAperturaMinimo: importe, saldoMinimo: importe, tasaInteresAnual: importe, periodicidadInteres: z.string().nullable(), costoMantenimiento: importe, periodicidadCosto: z.string().nullable(), mesesInactividad: z.number().nullable(), aplicaACuentasExistentes: z.boolean() })
export const cupoVigenciaSchema = z.object({ ...comunes, idProductoCanalCupo: z.number(), estadoCupo: z.enum(['A', 'I']), idCanal: z.number(), cupoDiarioMaximo: importe, cupoMensualMaximo: importe, montoMaxTransaccion: importe, maxTransaccionesDia: z.number() })
export const restriccionVigenciaSchema = z.object({ ...comunes, idRestriccion: z.number(), estado: z.enum(['A', 'I']), tipoRestriccion: z.string(), tipoCanonico: z.string(), descripcion: z.string(), dias: z.number().nullable(), monto: importe.nullable(), cantidad: z.number().nullable() })
export const tipoRestriccionSchema = z.object({ codigo: z.string(), nombre: z.string(), usaDias: z.boolean(), usaMonto: z.boolean(), usaCantidad: z.boolean() })
export const solicitudProductoSchema = z.object({ idSolicitud: z.number(), estado: z.enum(['Pendiente', 'Aprobada', 'Ejecutada', 'Rechazada', 'Cancelada', 'Fallida']), fecha: z.string(), responsable: z.string(), clase: z.enum(['condiciones', 'cupos', 'restricciones']), accion: z.enum(['programar', 'cancelar', 'fin']), datos: z.record(z.string(), z.unknown()).nullish(), idOrigen: z.number().nullish() })
export const vigenciasSchema = z.object({ fechaConsulta: z.iso.date(), condiciones: z.array(condicionVigenciaSchema), cupos: z.array(cupoVigenciaSchema), restricciones: z.array(restriccionVigenciaSchema), tiposRestriccion: z.array(tipoRestriccionSchema), solicitudes: z.array(solicitudProductoSchema) })
export type VigenciasProducto = z.infer<typeof vigenciasSchema>
export type TipoRestriccionVigencia = z.infer<typeof tipoRestriccionSchema>
export type ClaseConjunto = 'condiciones' | 'cupos' | 'restricciones'
export type EntradaCupoVigencia = { idCanal: number; codigoCanal: string; nombreCanal: string; habilitado: boolean; cupoDiarioMaximo: string; cupoMensualMaximo: string; montoMaxTransaccion: string; maxTransaccionesDia: string }

/** Compara centavos exactos; no redondea importes para decidir su validez. */
export function centavos(valor: string): bigint | null {
  if (!/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(valor)) return null
  const [entero, decimal = ''] = valor.split('.')
  return BigInt(entero) * 100n + BigInt(decimal.padEnd(2, '0'))
}
export function validarGrilla(filas: EntradaCupoVigencia[]): string | null {
  for (const f of filas.filter(f => f.habilitado)) {
    const diario = centavos(f.cupoDiarioMaximo), mensual = centavos(f.cupoMensualMaximo), transaccion = centavos(f.montoMaxTransaccion)
    if (diario === null || mensual === null || transaccion === null || diario <= 0n || transaccion <= 0n) return `${f.nombreCanal}: ingrese importes positivos de hasta dos decimales.`
    if (transaccion > diario || diario > mensual) return `${f.nombreCanal}: el maximo por transaccion no puede superar el diario ni este el mensual.`
    if (!/^\d{1,5}$/.test(f.maxTransaccionesDia) || Number(f.maxTransaccionesDia) < 1 || Number(f.maxTransaccionesDia) > 10_000) return `${f.nombreCanal}: ingrese de 1 a 10000 transacciones por dia.`
  }
  return null
}
