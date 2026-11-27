import { ESTADOS_SOLICITUD, type AccionSolicitud, type Boveda, type EstadoSolicitud, type SolicitudMovimiento } from '@/features/boveda/api/bovedas.contract'
import { valoresPorDenominacion } from '@/features/boveda/lib/formato'

/* Cómo se muestran las solicitudes de movimiento (SMV), sin UI para poder probarlo aparte */

const ETIQUETAS_ESTADO: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobada',
  DESPACHADO: 'En tránsito',
  RECIBIDO: 'Recibida',
  DEVUELTO: 'Devuelta',
  EJECUTADA: 'Ejecutada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  ANULADA: 'Anulada',
}

/** Opciones del filtro de estado, en plural */
export const OPCIONES_ESTADO_SOLICITUD: { valor: '' | EstadoSolicitud; texto: string }[] = [
  { valor: '', texto: 'Todas' },
  ...ESTADOS_SOLICITUD.map((valor) => ({ valor, texto: ETIQUETAS_ESTADO[valor] })),
]

const normalizar = (estado: string) => estado.trim().toUpperCase()

/** Un estado que la SPA no conoce se muestra tal cual */
export const etiquetaEstadoSolicitud = (estado: string) => ETIQUETAS_ESTADO[normalizar(estado) as EstadoSolicitud] ?? estado

/** Solo una solicitud pendiente se puede aprobar, rechazar o cancelar */
export const solicitudPendiente = (solicitud: Pick<SolicitudMovimiento, 'estado'>) => normalizar(solicitud.estado) === 'PENDIENTE'

export function accionesConfirmacion(solicitud: SolicitudMovimiento, agencia: string | null): AccionSolicitud[] {
  if (!agencia) return []
  const origen = agencia === solicitud.idAgencia
  const destino = agencia === solicitud.idAgenciaDestino
  const estado = normalizar(solicitud.estado)
  if (estado === 'PENDIENTE' && origen) return ['aprobacion']
  if (estado === 'APROBADO' && origen) return [solicitud.tipoMovimiento === 'ProvisionExterna' ? 'recepcion' : 'despacho']
  if (estado === 'DESPACHADO' && solicitud.tipoMovimiento === 'Traslado') {
    return [...(destino ? ['recepcion' as const] : []), ...(origen ? ['devolucion' as const] : [])]
  }
  if (estado === 'DESPACHADO' && solicitud.tipoMovimiento === 'EnvioExcedente' && origen) return ['cierre']
  return []
}

export type TonoEstado = 'pendiente' | 'exito' | 'rechazo' | 'neutro'

export function tonoEstadoSolicitud(estado: string): TonoEstado {
  switch (normalizar(estado)) {
    case 'PENDIENTE':
    case 'APROBADO':
    case 'DESPACHADO':
      return 'pendiente'
    case 'EJECUTADA':
    case 'RECIBIDO':
      return 'exito'
    case 'RECHAZADA':
      return 'rechazo'
    default:
      return 'neutro'
  }
}

/** Quién resolvió y con qué palabra: «Aprobada por», «Rechazada por» o «Cancelada por» */
export function textoResolucion(estado: string) {
  switch (normalizar(estado)) {
    case 'EJECUTADA':
    case 'APROBADO':
    case 'DESPACHADO':
    case 'RECIBIDO':
    case 'DEVUELTO':
    case 'ANULADA':
      return 'Aprobada por'
    case 'RECHAZADA':
      return 'Rechazada por'
    case 'CANCELADA':
      return 'Cancelada por'
    default:
      return 'Resuelta por'
  }
}

/**
 * Valor de cada denominación para leer el desglose: el `valorUnitario` que trae la solicitud manda;
 * el catálogo cubre las piezas que no lo traen.
 */
export function valoresDeSolicitud(solicitud: Pick<SolicitudMovimiento, 'desglose'>, catalogo: readonly { idDenominacion: number; valor: number }[]) {
  const propios = solicitud.desglose.flatMap((pieza) =>
    pieza.valorUnitario == null ? [] : [{ idDenominacion: pieza.idDenominacion, valor: pieza.valorUnitario }],
  )
  return valoresPorDenominacion(catalogo, propios)
}

/** Subtotal de una pieza en dólares, multiplicado en centavos */
export const subtotalPieza = (cantidad: number, valor: number | undefined) =>
  valor === undefined ? null : (cantidad * Math.round(valor * 100)) / 100

/** «BOV-MATRIZ-01» o, si no se conoce, «Bóveda 3» */
export function nombreBoveda(idBoveda: number | null | undefined, bovedas: readonly Pick<Boveda, 'idBoveda' | 'codigoBoveda'>[]) {
  if (idBoveda == null) return null
  return bovedas.find((item) => item.idBoveda === idBoveda)?.codigoBoveda ?? `Bóveda ${idBoveda}`
}
