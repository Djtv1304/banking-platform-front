import type { Revelacion } from '@/features/clientes/api/revelacion'

/* Máquina de estados de la revelación auditada (E5-05): pura, sin React ni red. */

/** El valor completo se oculta solo pasado este tiempo */
export const OCULTAR_TRAS_MS = 60_000

export type FaseRevelacion = 'cerrado' | 'pidiendo' | 'codigo' | 'verificando' | 'visible'

export interface EstadoRevelacion {
  fase: FaseRevelacion
  idDesafio: string | null
  comprobante: string | null
  codigo: string
  error: string | null
  /** Solo en memoria del componente: nunca en la caché de consultas ni en el almacenamiento del navegador */
  datos: Revelacion | null
}

export type AccionRevelacion =
  | { tipo: 'abrir' }
  | { tipo: 'desafio'; idDesafio: string; comprobante: string }
  | { tipo: 'codigo'; valor: string }
  | { tipo: 'verificar' }
  /** El backend no exige código (MFA apagado): se revela directo */
  | { tipo: 'sinCodigo' }
  | { tipo: 'revelado'; datos: Revelacion }
  | { tipo: 'fallo'; mensaje: string; nuevoCodigo: boolean }
  | { tipo: 'ocultar' }

export const REVELACION_INICIAL: EstadoRevelacion = { fase: 'cerrado', idDesafio: null, comprobante: null, codigo: '', error: null, datos: null }

export const codigoValido = (codigo: string) => /^\d{6}$/.test(codigo)

export function revelacionReducer(estado: EstadoRevelacion, accion: AccionRevelacion): EstadoRevelacion {
  switch (accion.tipo) {
    case 'abrir':
      return { ...REVELACION_INICIAL, fase: 'pidiendo' }
    case 'desafio':
      // Si se canceló mientras llegaba, el desafío se descarta
      return estado.fase === 'pidiendo' ? { ...estado, fase: 'codigo', idDesafio: accion.idDesafio, comprobante: accion.comprobante } : estado
    case 'codigo':
      return { ...estado, codigo: accion.valor.replace(/\D/g, '').slice(0, 6) }
    case 'sinCodigo':
      return estado.fase === 'pidiendo' ? { ...estado, fase: 'verificando' } : estado
    case 'verificar':
      return estado.fase === 'codigo' && estado.idDesafio && codigoValido(estado.codigo)
        ? { ...estado, fase: 'verificando', error: null }
        : estado
    case 'revelado':
      // Una respuesta que llega después de cancelar no se muestra
      return estado.fase === 'verificando' ? { ...REVELACION_INICIAL, fase: 'visible', datos: accion.datos } : estado
    case 'fallo':
      if (estado.fase !== 'pidiendo' && estado.fase !== 'verificando') return estado
      return {
        ...estado,
        fase: 'codigo',
        codigo: '',
        error: accion.mensaje,
        idDesafio: accion.nuevoCodigo ? null : estado.idDesafio,
        comprobante: accion.nuevoCodigo ? null : estado.comprobante,
      }
    case 'ocultar':
      return REVELACION_INICIAL
  }
}
