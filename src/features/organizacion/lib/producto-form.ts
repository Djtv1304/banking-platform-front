import { z } from 'zod'

import type { ApiError } from '@/shared/api'
import type {
  ProductoAdmin,
  SubProductoAdmin,
  ProductoCreate,
  ProductoUpdate,
  TipoProductoAdmin,
} from '@/features/organizacion/api/productos.contract'

/*
 * Formularios de productos y subproductos: mismas reglas que el backend (`/api/v1/productos`).
 * Los campos son texto; el esquema arma los valores del body y los vacíos quedan en `undefined`.
 */

/** Sin caracteres de control: el texto termina en pantallas, reportes y la auditoría */
const sinControl = (valor: string) =>
  [...valor].every((caracter) => {
    const codigo = caracter.charCodeAt(0)
    return codigo > 0x1f && codigo !== 0x7f
  })

const nombre = z
  .string()
  .trim()
  .min(3, 'Usa al menos 3 caracteres.')
  .max(100, 'Usa 100 caracteres como máximo.')
  .refine(sinControl, 'Escribe el nombre en una sola línea.')

const descripcion = z
  .string()
  .trim()
  .max(250, 'Usa 250 caracteres como máximo.')
  .refine(sinControl, 'Escribe la descripción en una sola línea.')
  .transform((valor) => valor || undefined)

export const ETIQUETA_TIPO: Record<TipoProductoAdmin, string> = {
  Cuenta: 'Cuenta',
  Credito: 'Crédito',
  Tarjeta: 'Tarjeta',
}

const camposProducto = z.object({
  codigoProducto: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{3,10}$/, 'Usa de 3 a 10 letras o números, sin espacios.'),
  nombreProducto: nombre,
  descripcion,
  idTipoProducto: z.string().optional(),
  tipoProducto: z.string(),
  tipoCuenta: z.string(),
  montoAperturaMinimo: z.string().trim(),
  idTipoCredito: z.string(),
  idRed: z.string(),
  permiteOperacionesPresenciales: z.boolean(),
})

/** Lo que pide cada tipo: Cuenta (tipo de cuenta y monto), Crédito (tipo de crédito), Tarjeta (red) */
export const productoFormSchema = camposProducto.superRefine((valor, ctx) => {
  const falta = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
  if (!['Cuenta', 'Credito', 'Tarjeta'].includes(valor.tipoProducto)) falta('tipoProducto', 'Elige el tipo de producto.')
  if (valor.tipoProducto === 'Cuenta') {
    if (!['Ahorro', 'Corriente'].includes(valor.tipoCuenta)) falta('tipoCuenta', 'Elige el tipo de cuenta.')
    if (valor.montoAperturaMinimo !== '' && !/^\d{1,13}(\.\d{1,2})?$/.test(valor.montoAperturaMinimo)) {
      falta('montoAperturaMinimo', 'Usa un monto en dólares, con hasta 2 decimales.')
    }
  }
  if (valor.tipoProducto === 'Credito' && !valor.idTipoCredito) falta('idTipoCredito', 'Elige el tipo de crédito.')
  if (valor.tipoProducto === 'Tarjeta' && !valor.idRed) falta('idRed', 'Elige la red de la tarjeta.')
})

export type ProductoFormInput = z.input<typeof camposProducto>
export type ProductoFormData = z.output<typeof camposProducto>
export type CampoProducto = keyof ProductoFormInput

export const VALORES_NUEVO: ProductoFormInput = {
  codigoProducto: '',
  nombreProducto: '',
  descripcion: '',
  idTipoProducto: '',
  tipoProducto: '',
  tipoCuenta: '',
  montoAperturaMinimo: '',
  idTipoCredito: '',
  idRed: '',
  permiteOperacionesPresenciales: true,
}

export const valoresEdicion = (producto: ProductoAdmin): ProductoFormInput => ({
  codigoProducto: producto.codigoProducto,
  nombreProducto: producto.nombreProducto,
  descripcion: producto.descripcion ?? '',
  idTipoProducto: producto.idTipoProducto != null ? String(producto.idTipoProducto) : '',
  tipoProducto: producto.tipoProducto,
  tipoCuenta: producto.tipoCuenta ?? '',
  montoAperturaMinimo: producto.montoAperturaMinimo != null ? String(producto.montoAperturaMinimo) : '',
  idTipoCredito: producto.idTipoCredito != null ? String(producto.idTipoCredito) : '',
  idRed: producto.idRed != null ? String(producto.idRed) : '',
  permiteOperacionesPresenciales: producto.permiteOperacionesPresenciales,
})

/** Solo los campos del tipo elegido: el backend rechaza los que no aplican */
export function payloadCrear(datos: ProductoFormData): ProductoCreate {
  const tipo = datos.tipoProducto as TipoProductoAdmin
  const body: ProductoCreate = {
    codigoProducto: datos.codigoProducto,
    nombreProducto: datos.nombreProducto,
    tipoProducto: tipo,
    permiteOperacionesPresenciales: datos.permiteOperacionesPresenciales,
  }
  if (datos.idTipoProducto) body.idTipoProducto = Number(datos.idTipoProducto)
  if (datos.descripcion) body.descripcion = datos.descripcion
  if (tipo === 'Cuenta') {
    body.tipoCuenta = datos.tipoCuenta as ProductoCreate['tipoCuenta']
    if (datos.montoAperturaMinimo) body.montoAperturaMinimo = Number(datos.montoAperturaMinimo)
  }
  if (tipo === 'Credito') body.idTipoCredito = Number(datos.idTipoCredito)
  if (tipo === 'Tarjeta') body.idRed = Number(datos.idRed)
  return body
}

/** Solo lo que cambió. Objeto vacío = nada que enviar. Descripción vaciada = `null` (se borra) */
export function payloadEdicion(inicial: ProductoFormInput, datos: ProductoFormData): ProductoUpdate {
  const body: ProductoUpdate = {}
  if (datos.codigoProducto !== inicial.codigoProducto.trim().toUpperCase()) body.codigoProducto = datos.codigoProducto
  if (datos.nombreProducto !== inicial.nombreProducto) body.nombreProducto = datos.nombreProducto
  if ((datos.descripcion ?? '') !== inicial.descripcion.trim()) body.descripcion = datos.descripcion ?? null
  if (datos.permiteOperacionesPresenciales !== inicial.permiteOperacionesPresenciales) {
    body.permiteOperacionesPresenciales = datos.permiteOperacionesPresenciales
  }
  if (
    datos.tipoProducto === 'Cuenta' &&
    datos.montoAperturaMinimo !== '' &&
    Number(datos.montoAperturaMinimo) !== Number(inicial.montoAperturaMinimo || '0')
  ) {
    body.montoAperturaMinimo = Number(datos.montoAperturaMinimo)
  }
  return body
}

/** Prefijos que definen débito o crédito en la emisión de tarjetas */
export const PREFIJOS_TARJETA = ['TDB', 'TCR'] as const

export function subProductoFormSchema(tipoProducto: TipoProductoAdmin) {
  return z
    .object({
      codigoSubProducto: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9-]{3,15}$/, 'Usa de 3 a 15 letras, números o guiones.'),
      nombreSubProducto: nombre,
      edadMinima: z.number().int().min(0).max(120).optional(),
      edadMaxima: z.number().int().min(0).max(120).optional(),
      tipoClientePermitido: z.enum(['Natural', 'Juridico', 'Ambos']).optional(),
      requiereTutor: z.boolean().optional(),
      idSubProductoRequerido: z.number().int().positive().optional(),
      maximoPorCliente: z.number().int().min(1).max(32767).optional(),
    })
    .superRefine((valor, ctx) => {
      if (valor.edadMinima != null && valor.edadMaxima != null && valor.edadMaxima < valor.edadMinima) {
        ctx.addIssue({ code: 'custom', path: ['edadMaxima'], message: 'La edad m\u00e1xima no puede ser menor que la m\u00ednima.' })
      }
      if (tipoProducto === 'Tarjeta' && !PREFIJOS_TARJETA.some((p) => valor.codigoSubProducto.startsWith(p))) {
        ctx.addIssue({
          code: 'custom',
          path: ['codigoSubProducto'],
          message: 'En tarjetas, empieza por TDB (débito) o TCR (crédito).',
        })
      }
    })
}

export type SubProductoFormInput = z.input<ReturnType<typeof subProductoFormSchema>>
export type SubProductoFormData = z.output<ReturnType<typeof subProductoFormSchema>>

const MENSAJES: Record<string, string> = {
  CODIGO_DUPLICADO: 'Ya existe un registro con ese código.',
  PRODUCTO_SIN_SUBPRODUCTOS: 'Agrega al menos un subproducto antes de activar el producto.',
  TIPO_CREDITO_NO_EXISTE: 'El tipo de crédito elegido no existe o está inactivo.',
  RED_NO_EXISTE: 'La red elegida no existe o está inactiva.',
  CODIGO_TARJETA_INVALIDO: 'En tarjetas, el código empieza por TDB (débito) o TCR (crédito).',
  PRODUCTO_NO_ENCONTRADO: 'El producto ya no existe. Recarga la lista.',
  SUBPRODUCTO_NO_ENCONTRADO: 'El subproducto ya no existe. Recarga la lista.',
  DATOS_INVALIDOS: 'Revisa los datos: hay valores que no son válidos.',
  CAMPO_NO_APLICA: 'Ese dato no aplica a este tipo de producto.',
  TASA_NO_APLICA: 'Hay tasas que ya no existen o no son del tipo de crédito del producto. Recarga e intenta otra vez.',
  SISTEMA_NO_EXISTE: 'Hay sistemas de amortización que ya no existen o están inactivos.',
  CANAL_NO_EXISTE: 'Hay canales que ya no existen o están inactivos. Recarga e intenta otra vez.',
  CUPO_MENOR_QUE_PERSONALIZADO:
    'Hay cuentas con cupos personalizados mayores en ese canal. Ajústalos antes de bajar o quitar el máximo.',
  TASAS_SOLAPADAS: 'Dos tasas de crédito vinculadas se cruzan en monto y fechas: deja solo una para cada rango.',
  COMISION_NO_EXISTE: 'Hay comisiones que ya no existen o están inactivas. Recarga e intenta otra vez.',
  SEGURO_NO_EXISTE: 'Hay seguros que ya no existen o están inactivos. Recarga e intenta otra vez.',
  TIPO_PRODUCTO_INVALIDO: 'El tipo seleccionado no corresponde al producto.',
  ESTADO_INVALIDO: 'El cambio de estado no est\u00e1 permitido.',
  PRODUCTO_NO_EDITABLE: 'Los datos solo se editan en Borrador y sin uso.',
  PRODUCTO_EN_USO: 'El producto tiene cuentas, tarjetas o créditos: no se elimina, solo se desactiva.',
  PRODUCTO_ACTIVO: 'Desactiva el producto antes de eliminarlo.',
  ELEGIBILIDAD_INVALIDA: 'La edad máxima no puede ser menor que la mínima.',
  CUPOS_INCOHERENTES: 'El cupo mensual debe ser mayor o igual que el diario, y el máximo por transacción no puede superar el diario.',
  ORIGEN_NO_PERMITIDO: 'La solicitud no llegó por el canal autorizado. Recarga la página e inténtalo otra vez.',
  USUARIO_INTERNO_NO_VINCULADO: 'Tu usuario no está habilitado para esta operación. Pide al administrador que lo vincule.',
}

export function mensajeErrorProducto(error: ApiError) {
  if (error.status === 403) return 'No tienes permiso para esta operaci\u00f3n.'
  return MENSAJES[error.code] ?? error.message
}

const CAMPO_DEL_ERROR: Record<string, CampoProducto> = {
  CODIGO_DUPLICADO: 'codigoProducto',
  TIPO_CREDITO_NO_EXISTE: 'idTipoCredito',
  RED_NO_EXISTE: 'idRed',
}

export const campoDelError = (error: ApiError): CampoProducto | null => CAMPO_DEL_ERROR[error.code] ?? null

/** Texto de las condiciones según el tipo, para leer el producto de un vistazo */
export function condicionesDe(producto: ProductoAdmin) {
  if (producto.tipoProducto === 'Cuenta') {
    const monto = (producto.montoAperturaMinimo ?? 0).toLocaleString('es-EC', { style: 'currency', currency: 'USD' })
    return `Cuenta de ${(producto.tipoCuenta ?? '').toLowerCase()} · apertura mínima ${monto}`
  }
  if (producto.tipoProducto === 'Credito') return `Crédito ${producto.nombreTipoCredito ?? ''}`.trim()
  return `Tarjeta ${producto.nombreRed ?? ''}`.trim()
}

/** Sin tildes ni mayúsculas: «credito» encuentra «Crédito de consumo» */
const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Busca en código, nombre, descripción, tipo y nombres de subproductos */
export function filtrarProductos(productos: readonly ProductoAdmin[], busqueda: string) {
  const termino = normalizar(busqueda.trim())
  if (!termino) return [...productos]
  return productos.filter((p) =>
    normalizar(
      [
        p.codigoProducto,
        p.nombreProducto,
        p.descripcion ?? '',
        ETIQUETA_TIPO[p.tipoProducto],
        ...p.subproductos.flatMap((s) => [s.codigoSubProducto, s.nombreSubProducto]),
      ].join(' '),
    ).includes(termino),
  )
}

export const rutaProducto = (idProducto: number) => `/productos/${idProducto}`

/** Títulos de los grupos del listado, en este orden */
export const GRUPO_TIPO: Record<TipoProductoAdmin, string> = {
  Cuenta: 'Cuentas',
  Credito: 'Créditos',
  Tarjeta: 'Tarjetas',
}

/** Productos agrupados por tipo (solo los grupos que tienen alguno) */
export function agruparPorTipo(productos: readonly ProductoAdmin[], tipos: readonly { idTipoProducto: number; codigo: string; nombre: string }[] = []) {
  const definidos = tipos.map((t) => ({ tipo: t.codigo, nombre: t.nombre, productos: productos.filter((p) => p.idTipoProducto === t.idTipoProducto) }))
  const sinTipo = productos.filter((p) => !tipos.some((t) => t.idTipoProducto === p.idTipoProducto))
  return [...definidos, ...(Object.keys(GRUPO_TIPO) as TipoProductoAdmin[])
    .map((tipo) => ({ tipo, nombre: GRUPO_TIPO[tipo], productos: sinTipo.filter((p) => p.tipoProducto === tipo) }))]
    .filter((g) => g.productos.length > 0)
}

/** Tres niveles de negocio. Los contenedores SQL no agregan un nivel al arbol. */
export function jerarquiaComercial(
  productos: readonly ProductoAdmin[],
  tipos: readonly { idTipoProducto: number; codigo: string; nombre: string }[] = [],
  estado = 'todos',
) {
  type Modelo = { producto: ProductoAdmin; subproducto: SubProductoAdmin | null }
  const familias: { tipo: TipoProductoAdmin; nombre: string; subproductos: { clave: string; nombre: string; modelos: Modelo[] }[] }[] = []
  for (const tipo of Object.keys(GRUPO_TIPO) as TipoProductoAdmin[]) {
    const grupos = new Map<string, { clave: string; nombre: string; modelos: Modelo[] }>()
    for (const producto of productos.filter((p) => p.tipoProducto === tipo)) {
      const catalogo = tipos.find((t) => t.idTipoProducto === producto.idTipoProducto)
      const modelos: (SubProductoAdmin | null)[] = producto.subproductos.length ? producto.subproductos : [null]
      for (const subproducto of modelos) {
        const estadoModelo = subproducto?.estadoCatalogo ?? (subproducto ? (subproducto.estado === 'A' ? 'Activo' : 'Suspendido') : producto.estadoCatalogo ?? (producto.estado === 'A' ? 'Activo' : 'Suspendido'))
        if (estado !== 'todos' && estadoModelo !== estado) continue
        const nombre = tipo === 'Cuenta'
          ? catalogo?.nombre ?? (producto.tipoCuenta === 'Corriente' ? 'Cuenta corriente' : producto.tipoCuenta === 'Ahorro' ? 'Cuenta de ahorro' : 'Cuentas sin clasificar')
          : tipo === 'Credito'
            ? producto.nombreTipoCredito ?? 'Creditos sin clasificar'
            : subproducto?.tipoTarjeta === 'Debito' ? 'Tarjeta de debito' : subproducto?.tipoTarjeta === 'Credito' ? 'Tarjeta de credito' : 'Tarjetas sin clasificar'
        const clave = tipo === 'Cuenta' ? catalogo?.codigo ?? `Cuenta-${producto.tipoCuenta ?? 'sin-tipo'}` : `${tipo}-${nombre}`
        let grupo = grupos.get(clave)
        if (!grupo) {
          grupo = { clave, nombre, modelos: [] }
          grupos.set(clave, grupo)
        }
        grupo.modelos.push({ producto, subproducto })
      }
    }
    if (grupos.size) familias.push({ tipo, nombre: GRUPO_TIPO[tipo], subproductos: [...grupos.values()] })
  }
  return familias
}

export const porcentaje = (fraccion: number) =>
  `${(fraccion * 100).toLocaleString('es-EC', { maximumFractionDigits: 2 })} %`

export const dinero = (valor: number | null | undefined) =>
  valor == null ? 'sin límite' : valor.toLocaleString('es-EC', { style: 'currency', currency: 'USD' })
