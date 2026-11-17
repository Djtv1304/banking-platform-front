import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  actualizarProducto,
  actualizarSubProducto,
  crearProducto,
  crearSubProducto,
  eliminarProducto,
  guardarCupos,
  guardarRestricciones,
  guardarVinculos,
  listarProductos,
  listarTiposProducto,
  obtenerCupos,
  obtenerFicha,
  obtenerProducto,
  obtenerRestricciones,
  obtenerVinculos,
} from '@/features/organizacion/api/productos.api'
import type {
  CupoCanalBody,
  DestinoVinculos,
  ProductoUpdate,
  RestriccionesBody,
  Vinculos,
  SubProductoCreate,
  SubProductoUpdate,
} from '@/features/organizacion/api/productos.contract'

const CLAVE_PRODUCTOS = ['organizacion', 'productos'] as const
/** El catálogo de productos activos (apertura de cuentas, tarjetas) también cambia al guardar */
const CLAVE_CATALOGO = ['catalogos', 'productos'] as const

export function useTiposProducto() {
  return useQuery({ queryKey: [...CLAVE_PRODUCTOS, 'tipos'], queryFn: listarTiposProducto })
}

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
      queryClient.invalidateQueries({ queryKey: ['organizacion', 'ficha'] }),
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
    onSuccess: async (cupos) => {
      queryClient.setQueryData(claveCupos(idSubProducto), cupos)
      await queryClient.invalidateQueries({ queryKey: ['organizacion', 'ficha', idSubProducto] })
    },
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
    onSuccess: async (r) => {
      queryClient.setQueryData(claveRestricciones(idSubProducto), r)
      await queryClient.invalidateQueries({ queryKey: ['organizacion', 'ficha', idSubProducto] })
    },
  })
}

const claveVinculos = (d: DestinoVinculos) => ['organizacion', 'vinculos', d.tipo, d.id] as const

export function useVinculos(destino: DestinoVinculos) {
  return useQuery({ queryKey: claveVinculos(destino), queryFn: () => obtenerVinculos(destino) })
}

/** Al guardar los del producto, los subproductos ven otra herencia: se refrescan todos */
export function useGuardarVinculos(destino: DestinoVinculos) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Vinculos) => guardarVinculos(destino, body),
    retry: false,
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['organizacion', 'vinculos'] }), queryClient.invalidateQueries({ queryKey: ['organizacion', 'ficha'] })]),
  })
}

export function useEliminarProducto() {
  const onSuccess = useAlGuardar()
  return useMutation({ mutationFn: eliminarProducto, retry: false, onSuccess })
}

export function useFichaSubProducto(idSubProducto: number) {
  return useQuery({
    queryKey: ['organizacion', 'ficha', idSubProducto],
    queryFn: () => obtenerFicha(idSubProducto),
    enabled: Number.isInteger(idSubProducto) && idSubProducto > 0,
  })
}


export function useImprimirFicha(idSubProducto: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => obtenerFicha(idSubProducto, true),
    retry: false,
    onSuccess: async (ficha) => {
      queryClient.setQueryData(['organizacion', 'ficha', idSubProducto], ficha)
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      window.print()
    },
  })
}
