import type { ActividadEconomica, Ciudad, Pais } from '@/features/catalogos/api/catalogos.contract'

/*
 * TODO(API): reemplazar los datos de ejemplo por los endpoints de catálogos (Paises, Ciudad,
 * ActividadEconomica). Datos de ejemplo mientras no existe la API de catálogos. Los hooks devuelven la misma forma que
 * `useQuery` ({ data, isLoading }) para que, al consumir la API, solo cambie este archivo:
 *   useQuery({ queryKey: ['catalogos', 'ciudades', codigoPais], queryFn: …, enabled: !!codigoPais })
 */

const PAISES: Pais[] = [
  { codigoPais: 'ECU', codigoNumerico: '218', nombrePais: 'Ecuador' },
  { codigoPais: 'COL', codigoNumerico: '170', nombrePais: 'Colombia' },
  { codigoPais: 'PER', codigoNumerico: '604', nombrePais: 'Perú' },
  { codigoPais: 'VEN', codigoNumerico: '862', nombrePais: 'Venezuela' },
  { codigoPais: 'USA', codigoNumerico: '840', nombrePais: 'Estados Unidos' },
  { codigoPais: 'ESP', codigoNumerico: '724', nombrePais: 'España' },
]

const CIUDADES: Ciudad[] = [
  { idCiudad: 1, codigoPais: 'ECU', nombre: 'Quito', provincia: 'Pichincha' },
  { idCiudad: 2, codigoPais: 'ECU', nombre: 'Sangolquí', provincia: 'Pichincha' },
  { idCiudad: 3, codigoPais: 'ECU', nombre: 'Cayambe', provincia: 'Pichincha' },
  { idCiudad: 4, codigoPais: 'ECU', nombre: 'Guayaquil', provincia: 'Guayas' },
  { idCiudad: 5, codigoPais: 'ECU', nombre: 'Durán', provincia: 'Guayas' },
  { idCiudad: 6, codigoPais: 'ECU', nombre: 'Cuenca', provincia: 'Azuay' },
  { idCiudad: 7, codigoPais: 'ECU', nombre: 'Ambato', provincia: 'Tungurahua' },
  { idCiudad: 8, codigoPais: 'ECU', nombre: 'Loja', provincia: 'Loja' },
  { idCiudad: 9, codigoPais: 'ECU', nombre: 'Manta', provincia: 'Manabí' },
  { idCiudad: 10, codigoPais: 'ECU', nombre: 'Portoviejo', provincia: 'Manabí' },
  { idCiudad: 11, codigoPais: 'COL', nombre: 'Bogotá', provincia: 'Cundinamarca' },
  { idCiudad: 12, codigoPais: 'COL', nombre: 'Pasto', provincia: 'Nariño' },
  { idCiudad: 13, codigoPais: 'PER', nombre: 'Lima', provincia: 'Lima' },
  { idCiudad: 14, codigoPais: 'PER', nombre: 'Piura', provincia: 'Piura' },
]

const ACTIVIDADES: ActividadEconomica[] = [
  { idActividadEconomica: 1, descripcion: 'Cultivo de banano', areaActividad: 'Agricultura', estado: 'A' },
  { idActividadEconomica: 2, descripcion: 'Cultivo de cacao', areaActividad: 'Agricultura', estado: 'A' },
  { idActividadEconomica: 3, descripcion: 'Cría de ganado bovino', areaActividad: 'Agricultura', estado: 'A' },
  { idActividadEconomica: 4, descripcion: 'Venta al por menor en tiendas de abarrotes', areaActividad: 'Comercio', estado: 'A' },
  { idActividadEconomica: 5, descripcion: 'Venta al por mayor de productos textiles', areaActividad: 'Comercio', estado: 'A' },
  { idActividadEconomica: 6, descripcion: 'Venta de repuestos automotrices', areaActividad: 'Comercio', estado: 'A' },
  { idActividadEconomica: 7, descripcion: 'Elaboración de productos de panadería', areaActividad: 'Manufactura', estado: 'A' },
  { idActividadEconomica: 8, descripcion: 'Confección de prendas de vestir', areaActividad: 'Manufactura', estado: 'A' },
  { idActividadEconomica: 9, descripcion: 'Transporte de carga por carretera', areaActividad: 'Servicios', estado: 'A' },
  { idActividadEconomica: 10, descripcion: 'Restaurantes y servicio de comidas', areaActividad: 'Servicios', estado: 'A' },
  { idActividadEconomica: 11, descripcion: 'Actividades profesionales independientes', areaActividad: 'Servicios', estado: 'A' },
  { idActividadEconomica: 12, descripcion: 'Empleado en relación de dependencia', areaActividad: 'Dependiente', estado: 'A' },
  { idActividadEconomica: 13, descripcion: 'Jubilado o pensionista', areaActividad: 'Dependiente', estado: 'A' },
  { idActividadEconomica: 14, descripcion: 'Estudiante', areaActividad: 'Dependiente', estado: 'A' },
  { idActividadEconomica: 15, descripcion: 'Pesca artesanal', areaActividad: 'Agricultura', estado: 'I' },
]

export const usePaises = () => ({ data: PAISES, isLoading: false })

/** Ciudades de un país (vacío hasta elegir el país) */
export const useCiudades = (codigoPais: string | undefined) => ({
  data: codigoPais ? CIUDADES.filter((ciudad) => ciudad.codigoPais === codigoPais) : [],
  isLoading: false,
})

/** Solo actividades activas */
export const useActividadesEconomicas = () => ({
  data: ACTIVIDADES.filter((actividad) => actividad.estado === 'A'),
  isLoading: false,
})
