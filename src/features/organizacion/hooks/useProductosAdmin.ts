import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  actualizarProducto,
  actualizarSubProducto,
  crearProducto,
  crearSubProducto,
  guardarCupos,
  guardarRestricciones,
  listarProductos,
  obtenerCupos,
  obtenerProducto,
  obtenerRestricciones,
} from '@/features/organizacion/api/productos.api'
import type {
  CupoCanalBody,
  ProductoUpdate,
  RestriccionesBody,
  SubProductoCreate,
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

const claveCupos = (idSubProducto: number) => ['organizacion', 'cupos', idSubProducto] as const
const claveRestricciones = (idSubProducto: number) => ['organizacion', 'restricciones', idSubProducto] as const

export function useCuposSubProducto(idSubProducto: number) {
  return useQuery({ queryKey: claveCupos(idSubProducto), queryFn: () => obtenerCupos(idSubProducto) })
}

export function useGuardarCupos(idSubProducto: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (cupos: CupoCanalBody[]) => guardarCupos(idSubProducto, cupos),
    retry: false,
    onSuccess: (cupos) => queryClient.setQueryData(claveCupos(idSubProducto), cupos),
  })
}

export function useRestriccionesSubProducto(idSubProducto: number) {
  return useQuery({ queryKey: claveRestricciones(idSubProducto), queryFn: () => obtenerRestricciones(idSubProducto) })
}

export function useGuardarRestricciones(idSubProducto: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: RestriccionesBody) => guardarRestricciones(idSubProducto, body),
    retry: false,
    onSuccess: (r) => queryClient.setQueryData(claveRestricciones(idSubProducto), r),
  })
}
