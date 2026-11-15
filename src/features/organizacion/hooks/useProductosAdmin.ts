import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  actualizarProducto,
  actualizarSubProducto,
  crearProducto,
  crearSubProducto,
  guardarParametros,
  listarProductos,
  obtenerParametros,
  obtenerProducto,
} from '@/features/organizacion/api/productos.api'
import type {
  ProductoUpdate,
  SubProductoCreate,
  SubProductoParametrosBody,
  SubProductoUpdate,
} from '@/features/organizacion/api/productos.contract'

const CLAVE_PRODUCTOS = ['organizacion', 'productos'] as const
/** El catálogo de productos activos (apertura de cuentas, tarjetas) también cambia al guardar */
const CLAVE_CATALOGO = ['catalogos', 'productos'] as const

export function useProductosAdmin() {
  return useQuery({ queryKey: CLAVE_PRODUCTOS, queryFn: listarProductos })
}

/** El detalle comparte la clave de la lista: se refresca con ella al guardar */
export function useProductoAdmin(idProducto: number) {
  return useQuery({
    queryKey: [...CLAVE_PRODUCTOS, idProducto],
    queryFn: () => obtenerProducto(idProducto),
    enabled: Number.isInteger(idProducto) && idProducto > 0,
  })
}

const claveParametros = (idSubProducto: number) => ['organizacion', 'parametros', idSubProducto] as const

export function useParametrosSubProducto(idSubProducto: number | null) {
  return useQuery({
    queryKey: claveParametros(idSubProducto ?? 0),
    queryFn: () => obtenerParametros(idSubProducto ?? 0),
    enabled: idSubProducto !== null,
  })
}

/** Sin reintento: una escritura no se repite sola */
export function useGuardarParametros() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ idSubProducto, body }: { idSubProducto: number; body: SubProductoParametrosBody }) =>
      guardarParametros(idSubProducto, body),
    retry: false,
    onSuccess: (parametros) => queryClient.setQueryData(claveParametros(parametros.idSubProducto), parametros),
  })
}

function useAlGuardar() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: CLAVE_PRODUCTOS }),
      queryClient.invalidateQueries({ queryKey: CLAVE_CATALOGO }),
    ])
}

/** Sin reintento: una escritura no se repite sola */
export function useCrearProducto() {
  const onSuccess = useAlGuardar()
  return useMutation({ mutationFn: crearProducto, retry: false, onSuccess })
}

export function useActualizarProducto() {
  const onSuccess = useAlGuardar()
  return useMutation({
    mutationFn: ({ idProducto, body }: { idProducto: number; body: ProductoUpdate }) => actualizarProducto(idProducto, body),
    retry: false,
    onSuccess,
  })
}

export function useCrearSubProducto() {
  const onSuccess = useAlGuardar()
  return useMutation({
    mutationFn: ({ idProducto, body }: { idProducto: number; body: SubProductoCreate }) => crearSubProducto(idProducto, body),
    retry: false,
    onSuccess,
  })
}

export function useActualizarSubProducto() {
  const onSuccess = useAlGuardar()
  return useMutation({
    mutationFn: ({ idSubProducto, body }: { idSubProducto: number; body: SubProductoUpdate }) =>
      actualizarSubProducto(idSubProducto, body),
    retry: false,
    onSuccess,
  })
}
