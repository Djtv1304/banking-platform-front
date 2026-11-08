/*
 * Contrato de consulta de clientes y sus documentos (historia C-02).
 * TODO(API): ajustar nombres y valores a la respuesta real cuando se publique el contrato.
 */

export type TipoIdentificacion = 'CEDULA' | 'RUC' | 'PASAPORTE'
export type EstadoCliente = 'ACTIVO' | 'INACTIVO'

/** Resultado de la búsqueda por identificación */
export interface ClienteResumen {
  idCliente: number
  tipoCliente: 'NATURAL' | 'JURIDICO'
  tipoDocumento: TipoIdentificacion
  identificacion: string
  nombre: string
  email: string
  estado: EstadoCliente
  fechaRegistro: string
}

/** Ficha completa: solo para el personal */
export interface ClienteDetalle extends ClienteResumen {
  nombres: string | null
  apellidos: string | null
  razonSocial: string | null
  nombreComercial: string | null
  fechaNacimiento: string | null
  nacionalidad: string | null
  estadoCivil: string | null
  telefonoCelular: string
  telefonoConvencional: string | null
  direccionPrincipal: string
}

/**
 * Lo que ve el propio cliente: el backend ya lo entrega enmascarado, así los datos sensibles
 * nunca llegan al navegador.
 */
export interface PerfilCliente {
  nombre: string
  tipoCliente: 'NATURAL' | 'JURIDICO'
  tipoDocumento: TipoIdentificacion
  identificacionEnmascarada: string
  email: string
  telefonoCelularEnmascarado: string
  ciudad: string
  fechaRegistro: string
}

export type CategoriaDocumento =
  | 'APERTURA_CUENTA'
  | 'CONTRATO_CUENTA'
  | 'SOLICITUD_TARJETA'
  | 'CREDITO'
  | 'IDENTIFICACION'
  | 'OTROS'

export interface DocumentoCliente {
  idDocumento: number
  idCliente: number
  categoria: CategoriaDocumento
  nombre: string
  formato: 'PDF' | 'JPG' | 'PNG'
  tamanoBytes: number
  fechaCarga: string
  /** Producto relacionado, p. ej. el número de cuenta o de tarjeta */
  referencia: string | null
  cargadoPor: string
}

export interface SubirDocumentoRequest {
  categoria: CategoriaDocumento
  nombre: string
  referencia: string | null
  archivo: File
}
