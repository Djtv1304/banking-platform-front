/*
 * Contrato de los catálogos (tablas Paises, Ciudad y ActividadEconomica) en camelCase.
 */

export interface Pais {
  codigoPais: string // char(3), ISO 3166-1 alfa-3 (PK)
  codigoNumerico: string // char(3)
  nombrePais: string
}

export interface Ciudad {
  idCiudad: number
  codigoPais: string
  nombre: string
  provincia: string
}

export interface ActividadEconomica {
  idActividadEconomica: number
  descripcion: string
  areaActividad: string
}
