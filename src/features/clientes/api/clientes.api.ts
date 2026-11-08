import { ApiError } from '@/shared/api'
import type {
  ClienteDetalle,
  ClienteResumen,
  DocumentoCliente,
  PerfilCliente,
  SubirDocumentoRequest,
  TipoIdentificacion,
} from '@/features/clientes/api/clientes.contract'

/*
 * TODO(API): reemplazar esta simulación en memoria por el backend, por ejemplo:
 *   GET  /api/v1/clientes?tipoDocumento=&identificacion=  → 200 ClienteResumen | 404 (no existe)
 *   GET  /api/v1/clientes/{idCliente}                     → ClienteDetalle
 *   GET  /api/v1/clientes/{idCliente}/documentos          → DocumentoCliente[]
 *   POST /api/v1/clientes/{idCliente}/documentos          → multipart/form-data
 *   GET  /api/v1/clientes/me  y  /api/v1/clientes/me/documentos (vista del cliente)
 * Los hooks y componentes no cambian: solo el cuerpo de estas funciones.
 */

const CLIENTES: ClienteDetalle[] = [
  {
    idCliente: 1, tipoCliente: 'NATURAL', tipoDocumento: 'CEDULA', identificacion: '1710034065',
    nombre: 'Ana María Pérez Andrade', nombres: 'Ana María', apellidos: 'Pérez Andrade', razonSocial: null,
    nombreComercial: null, fechaNacimiento: '1990-05-10', nacionalidad: 'Ecuador', estadoCivil: 'Casada',
    telefonoCelular: '+593991234567', telefonoConvencional: '022345678', email: 'ana.perez@correo.com',
    direccionPrincipal: 'Av. Amazonas N34-120 y Av. Colón, Quito, Pichincha', estado: 'ACTIVO', fechaRegistro: '2023-06-20',
  },
  {
    idCliente: 2, tipoCliente: 'JURIDICO', tipoDocumento: 'RUC', identificacion: '1790011674001',
    nombre: 'Comercial Andes S.A.', nombres: null, apellidos: null, razonSocial: 'Comercial Andes S.A.',
    nombreComercial: 'Andes Market', fechaNacimiento: null, nacionalidad: null, estadoCivil: null,
    telefonoCelular: '+593987654321', telefonoConvencional: '042567890', email: 'finanzas@andesmarket.ec',
    direccionPrincipal: 'Av. 9 de Octubre 1220 y García Avilés, Guayaquil, Guayas', estado: 'ACTIVO', fechaRegistro: '2021-04-15',
  },
  {
    idCliente: 3, tipoCliente: 'NATURAL', tipoDocumento: 'PASAPORTE', identificacion: 'AB1234567',
    nombre: 'Lucía Fernanda Gómez', nombres: 'Lucía Fernanda', apellidos: 'Gómez', razonSocial: null,
    nombreComercial: null, fechaNacimiento: '1985-11-02', nacionalidad: 'Colombia', estadoCivil: 'Soltera',
    telefonoCelular: '+593998877665', telefonoConvencional: null, email: 'lucia.gomez@correo.com',
    direccionPrincipal: 'Calle Larga 7-45 y Benigno Malo, Cuenca, Azuay', estado: 'INACTIVO', fechaRegistro: '2026-05-02',
  },
]

const documentos: DocumentoCliente[] = [
  { idDocumento: 1, idCliente: 1, categoria: 'APERTURA_CUENTA', nombre: 'Formulario de apertura de cuenta de ahorros', formato: 'PDF', tamanoBytes: 245_760, fechaCarga: '2024-03-12T10:20:00', referencia: 'Cuenta 2201004521', cargadoPor: 'María López' },
  { idDocumento: 2, idCliente: 1, categoria: 'APERTURA_CUENTA', nombre: 'Planilla de servicio básico', formato: 'JPG', tamanoBytes: 1_310_720, fechaCarga: '2024-03-12T10:24:00', referencia: 'Cuenta 2201004521', cargadoPor: 'María López' },
  { idDocumento: 3, idCliente: 1, categoria: 'CONTRATO_CUENTA', nombre: 'Contrato de cuenta de ahorros', formato: 'PDF', tamanoBytes: 512_000, fechaCarga: '2024-03-12T10:40:00', referencia: 'Cuenta 2201004521', cargadoPor: 'María López' },
  { idDocumento: 4, idCliente: 1, categoria: 'CONTRATO_CUENTA', nombre: 'Contrato de ahorro programado', formato: 'PDF', tamanoBytes: 498_000, fechaCarga: '2025-01-08T15:05:00', referencia: 'Cuenta 2201007788', cargadoPor: 'Jorge Andrade' },
  { idDocumento: 5, idCliente: 1, categoria: 'SOLICITUD_TARJETA', nombre: 'Solicitud de tarjeta de débito', formato: 'PDF', tamanoBytes: 188_416, fechaCarga: '2024-03-15T09:10:00', referencia: 'Tarjeta •••• 8812', cargadoPor: 'María López' },
  { idDocumento: 6, idCliente: 1, categoria: 'CREDITO', nombre: 'Solicitud de crédito de consumo', formato: 'PDF', tamanoBytes: 733_184, fechaCarga: '2026-09-02T11:30:00', referencia: 'Crédito 45-00981', cargadoPor: 'Jorge Andrade' },
  { idDocumento: 7, idCliente: 1, categoria: 'IDENTIFICACION', nombre: 'Copia de cédula de identidad', formato: 'PNG', tamanoBytes: 905_216, fechaCarga: '2023-06-20T08:45:00', referencia: null, cargadoPor: 'María López' },
  { idDocumento: 8, idCliente: 2, categoria: 'IDENTIFICACION', nombre: 'RUC de la empresa', formato: 'PDF', tamanoBytes: 156_000, fechaCarga: '2021-04-15T10:00:00', referencia: null, cargadoPor: 'Pedro Salazar' },
  { idDocumento: 9, idCliente: 2, categoria: 'IDENTIFICACION', nombre: 'Nombramiento del representante legal', formato: 'PDF', tamanoBytes: 210_000, fechaCarga: '2021-04-15T10:05:00', referencia: null, cargadoPor: 'Pedro Salazar' },
  { idDocumento: 10, idCliente: 2, categoria: 'APERTURA_CUENTA', nombre: 'Formulario de apertura de cuenta corriente', formato: 'PDF', tamanoBytes: 301_000, fechaCarga: '2022-11-03T14:00:00', referencia: 'Cuenta 3301000145', cargadoPor: 'Pedro Salazar' },
  { idDocumento: 11, idCliente: 2, categoria: 'CONTRATO_CUENTA', nombre: 'Contrato de cuenta corriente', formato: 'PDF', tamanoBytes: 640_000, fechaCarga: '2022-11-03T14:30:00', referencia: 'Cuenta 3301000145', cargadoPor: 'Pedro Salazar' },
  { idDocumento: 12, idCliente: 3, categoria: 'IDENTIFICACION', nombre: 'Copia de pasaporte', formato: 'PDF', tamanoBytes: 420_000, fechaCarga: '2026-05-02T12:00:00', referencia: null, cargadoPor: 'Lucía Cevallos' },
]

/** En la simulación, el cliente con sesión iniciada es el primero */
const ID_CLIENTE_SESION = 1

const simularRed = <T,>(valor: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(valor)), 450))

const aResumen = ({ idCliente, tipoCliente, tipoDocumento, identificacion, nombre, email, estado, fechaRegistro }: ClienteDetalle): ClienteResumen => ({
  idCliente, tipoCliente, tipoDocumento, identificacion, nombre, email, estado, fechaRegistro,
})

/** null = la identificación es válida pero no hay un cliente registrado con ella */
export async function buscarCliente(tipoDocumento: TipoIdentificacion, identificacion: string) {
  const cliente = CLIENTES.find((item) => item.tipoDocumento === tipoDocumento && item.identificacion === identificacion)
  return simularRed(cliente ? aResumen(cliente) : null)
}

export async function getCliente(idCliente: number): Promise<ClienteDetalle> {
  const cliente = CLIENTES.find((item) => item.idCliente === idCliente)
  if (!cliente) throw new ApiError('El cliente no existe.', 404, 'CLIENTE_NO_ENCONTRADO')
  return simularRed(cliente)
}

export async function getDocumentosCliente(idCliente: number) {
  return simularRed(documentos.filter((documento) => documento.idCliente === idCliente))
}

export async function subirDocumento(idCliente: number, request: SubirDocumentoRequest) {
  const documento: DocumentoCliente = {
    idDocumento: Math.max(...documentos.map((item) => item.idDocumento)) + 1,
    idCliente,
    categoria: request.categoria,
    nombre: request.nombre,
    formato: request.archivo.type === 'application/pdf' ? 'PDF' : request.archivo.type === 'image/png' ? 'PNG' : 'JPG',
    tamanoBytes: request.archivo.size,
    fechaCarga: new Date().toISOString(),
    referencia: request.referencia,
    cargadoPor: 'Tú',
  }
  documentos.push(documento)
  return simularRed(documento)
}

export async function getMiPerfil(): Promise<PerfilCliente> {
  const cliente = CLIENTES.find((item) => item.idCliente === ID_CLIENTE_SESION)!
  return simularRed({
    nombre: cliente.nombre,
    tipoCliente: cliente.tipoCliente,
    tipoDocumento: cliente.tipoDocumento,
    identificacionEnmascarada: `••••••${cliente.identificacion.slice(-4)}`,
    email: cliente.email,
    telefonoCelularEnmascarado: `+593 •• ••• ${cliente.telefonoCelular.slice(-4)}`,
    ciudad: 'Quito',
    fechaRegistro: cliente.fechaRegistro,
  })
}

export async function getMisDocumentos() {
  return getDocumentosCliente(ID_CLIENTE_SESION)
}
