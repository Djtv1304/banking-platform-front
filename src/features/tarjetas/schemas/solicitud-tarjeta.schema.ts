import { z } from 'zod'

import type { TarjetaCreate } from '@/features/tarjetas/api/tarjetas.contract'

/*
 * Formulario de solicitud de tarjeta (A-04 / TAR-01). Los selects trabajan con texto (ids como
 * string) y `aSolicitud` arma el body numérico de la API. El cliente se busca fuera del
 * formulario: aquí solo vive lo que se envía.
 */

/** Mismo patrón que valida el backend (TarjetaCreate.nombreTarjeta); se guarda en mayúsculas */
const NOMBRE_TARJETA_REGEX = /^[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ .'-]*$/
/** Lo que admite el grabado de una tarjeta física (NombreTarjeta varchar(26)) */
export const NOMBRE_TARJETA_MAX = 26
const DIRECCION_MAX = 250

/** Valor de `origenDireccion` cuando la dirección se escribe a mano */
export const DIRECCION_NUEVA = 'nueva'

export const solicitudTarjetaSchema = z
  .object({
    idCuenta: z.string().min(1, 'Selecciona la cuenta a la que se asociará la tarjeta.'),
    tipoTarjeta: z.enum(['Debito', 'Credito'], { error: 'Selecciona el tipo de tarjeta.' }),
    idSubProducto: z.string().min(1, 'Selecciona el producto de tarjeta.'),
    nombreTarjeta: z
      .string()
      .trim()
      .min(1, 'Ingresa el nombre que irá impreso en la tarjeta.')
      .max(NOMBRE_TARJETA_MAX, `Máximo ${NOMBRE_TARJETA_MAX} caracteres.`)
      .regex(NOMBRE_TARJETA_REGEX, 'Solo letras, espacios, punto, guion y apóstrofo.'),
    esExtension: z.boolean(),
    idTarjetaTitular: z.string(),
    requiereEnvio: z.boolean(),
    /** Id de una dirección del cliente, o DIRECCION_NUEVA para escribirla a mano */
    origenDireccion: z.string(),
    direccionEnvio: z.string().trim().max(DIRECCION_MAX, `Máximo ${DIRECCION_MAX} caracteres.`),
    provinciaEnvio: z.string(),
    idCiudadEnvio: z.string(),
  })
  .superRefine((valor, ctx) => {
    if (valor.esExtension && !valor.idTarjetaTitular) {
      ctx.addIssue({ code: 'custom', path: ['idTarjetaTitular'], message: 'Selecciona la tarjeta titular.' })
    }
    if (valor.requiereEnvio && !valor.origenDireccion) {
      ctx.addIssue({ code: 'custom', path: ['origenDireccion'], message: 'Elige la dirección de envío.' })
    }
    if (valor.requiereEnvio && valor.origenDireccion === DIRECCION_NUEVA) {
      if (!valor.direccionEnvio) {
        ctx.addIssue({ code: 'custom', path: ['direccionEnvio'], message: 'Ingresa la dirección de envío.' })
      }
      if (!valor.idCiudadEnvio) {
        ctx.addIssue({ code: 'custom', path: ['idCiudadEnvio'], message: 'Selecciona la ciudad de envío.' })
      }
    }
  })

export type SolicitudTarjetaInput = z.input<typeof solicitudTarjetaSchema>
export type SolicitudTarjetaData = z.output<typeof solicitudTarjetaSchema>

export const SOLICITUD_VACIA: SolicitudTarjetaInput = {
  idCuenta: '',
  tipoTarjeta: 'Debito',
  idSubProducto: '',
  nombreTarjeta: '',
  esExtension: false,
  idTarjetaTitular: '',
  requiereEnvio: false,
  origenDireccion: '',
  direccionEnvio: '',
  provinciaEnvio: '',
  idCiudadEnvio: '',
}

/** Nombre impreso sugerido: mayúsculas y sin tildes, como lo graba la tarjeta */
export function nombreImpreso(nombre: string) {
  return nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z .'-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NOMBRE_TARJETA_MAX)
}

/** Dirección de envío ya resuelta: la elegida del cliente o la escrita a mano */
export interface DireccionEnvio {
  texto: string
  idCiudad: number
}

/** Texto de envío a partir de una dirección registrada del cliente (máx. 250, como TAR-01) */
export function textoDireccion(direccion: {
  calleDireccion: string
  sector?: string | null
  referenciaUbicacion: string
}) {
  const partes = [direccion.calleDireccion, direccion.sector, `Ref.: ${direccion.referenciaUbicacion}`]
  return partes.filter(Boolean).join(', ').slice(0, DIRECCION_MAX)
}

/** Body de TAR-01. `idProducto` es el producto dueño del subproducto elegido */
export function aSolicitud(
  valor: SolicitudTarjetaData,
  idProducto: number,
  envio: DireccionEnvio | null,
): TarjetaCreate {
  return {
    idCuenta: Number(valor.idCuenta),
    idProducto,
    idSubProducto: Number(valor.idSubProducto),
    tipoTarjeta: valor.tipoTarjeta,
    nombreTarjeta: valor.nombreTarjeta,
    esExtension: valor.esExtension,
    ...(valor.esExtension && { idTarjetaTitular: Number(valor.idTarjetaTitular) }),
    requiereEnvio: valor.requiereEnvio && !!envio,
    ...(valor.requiereEnvio && envio && { direccionEnvio: envio.texto, idCiudadEnvio: envio.idCiudad }),
  }
}
