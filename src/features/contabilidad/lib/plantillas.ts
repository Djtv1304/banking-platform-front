import { ApiError, toApiError } from '@/shared/api'
import type { LineaPlantilla, ResumenPlantilla } from '@/features/contabilidad/api/plantillas.api'

export const origenesPlantilla = ['CAJA', 'ATM', 'BOVEDA', 'CUENTAS', 'CREDITO', 'TARJETA', 'TRANSACCIONES', 'NOMINA', 'MANUAL', 'CIERRE', 'AJUSTE']

const etiquetas: Record<string, string> = {
  DEBITO: 'Débito', CREDITO: 'Crédito', INTERES: 'Interés', COMISION: 'Comisión',
  CONTRAPRODUCTO: 'Contraproducto', BOVEDA: 'Bóveda', NOMINA: 'Nómina', ATM: 'ATM',
}

export const etiquetaPlantilla = (valor: string) =>
  Object.hasOwn(etiquetas, valor) ? etiquetas[valor] : valor.charAt(0) + valor.slice(1).toLowerCase()

export const claseSelectorPlantilla = 'block min-h-9 w-full rounded-lg border border-input bg-field px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50'

export function estadoPlantilla(plantilla: ResumenPlantilla, fecha?: string) {
  if (!plantilla.Estado) return 'Inactiva'
  if (!fecha) return 'Activa'
  if (plantilla.VigenciaDesde > fecha) return 'Programada'
  if (plantilla.VigenciaHasta && plantilla.VigenciaHasta < fecha) return 'Histórica'
  return 'Vigente'
}

const campos: Record<string, string> = {
  q: 'Búsqueda', codigo: 'Código', codigoPlantilla: 'Código', idTipoAsiento: 'Tipo de asiento',
  id_tipo: 'Tipo de asiento', id_plantilla: 'Versión', estado: 'Estado', nombre: 'Nombre',
  vigenciaDesde: 'Inicio de vigencia', lineas: 'Movimientos contables', lado: 'Movimiento',
  cuenta: 'Cuenta contable', rol: 'Rol contable', origen: 'Origen', base: 'Componente del importe',
  montos: 'Importes de ejemplo', producto: 'Cuentas de producto', contraproducto: 'Cuentas de contraproducto',
  comision: 'Cuenta de comisión',
}

const errores: Record<string, string> = {
  TIPO_AMBIGUO: 'Selecciona una familia de plantillas antes de preparar la versión.',
  VIGENCIA_INVALIDA: 'El inicio de vigencia debe ser posterior a la fecha contable actual.',
  PLANTILLA_NO_CUADRA: 'Cada componente debe tener el mismo número de líneas de débito y de crédito.',
  CUENTA_CONTABLE_NO_HABILITADA: 'Selecciona una cuenta auxiliar activa e imputable.',
  ROL_NO_DEFINIDO: 'El rol contable indicado no existe. Revisa su código.',
  ORIGEN_INVALIDO: 'Revisa la cuenta o el rol que corresponde al origen de la línea.',
  PLANTILLA_NO_DEFINIDA: 'No encontramos la versión de plantilla solicitada.',
}

function campoValidacion(field: string) {
  const partes = field.split(/[.[\]]+/).filter(Boolean)
  const indice = partes.indexOf('lineas')
  const nombre = [...partes].reverse().find((parte) => Object.hasOwn(campos, parte))
  const etiqueta = nombre ? campos[nombre] : 'Datos del formulario'
  return indice !== -1 && /^\d+$/.test(partes[indice + 1] ?? '')
    ? `Línea ${Number(partes[indice + 1]) + 1} · ${etiqueta}`
    : etiqueta
}

export function traducirErrorPlantilla(error: unknown) {
  const api = toApiError(error)
  const fields = api.fields.map(({ field, message }) => ({
    field: campoValidacion(field),
    message: /required|missing/i.test(message) ? 'Este campo es obligatorio.' : 'Revisa el valor ingresado o selecciona una opción válida.',
  }))
  const mensaje = api.status === 403 ? 'No tienes permiso para realizar esta acción.'
    : fields.length > 0 ? 'Revisa los campos indicados.'
    : Object.hasOwn(errores, api.code) ? errores[api.code]
    : api.code === 'DATOS_INVALIDOS' ? 'Revisa los datos de la solicitud.' : api.message
  return new ApiError(mensaje, api.status, api.code, fields, api.traceId)
}

export function validarLineasPlantilla(lineas: LineaPlantilla[], auxiliares: ReadonlySet<number>) {
  const errores: Record<string, string> = {}
  const balance = new Map<string, number>()
  lineas.forEach((linea, i) => {
    balance.set(linea.base, (balance.get(linea.base) ?? 0) + (linea.lado === 'DEBITO' ? 1 : -1))
    if (linea.origen === 'FIJA' && (linea.cuenta === null || !auxiliares.has(linea.cuenta))) errores[`linea-${i}`] = 'Selecciona una cuenta auxiliar activa.'
    if ((linea.origen === 'PRODUCTO' || linea.origen === 'CONTRAPRODUCTO') && (!linea.rol?.trim() || linea.rol.length > 30)) {
      errores[`linea-${i}`] = 'Ingresa un código de rol contable de hasta 30 caracteres.'
    }
  })
  if (lineas.length < 2 || lineas.length > 100 || [...balance.values()].some((total) => total !== 0)) {
    errores.lineas = 'Cada componente debe tener el mismo número de débitos y créditos. Agrega entre 2 y 100 líneas.'
  }
  return errores
}
