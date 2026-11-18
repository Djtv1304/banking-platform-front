import type { CambioFuncion, ConfiguracionFunciones, Funcion, ValorAjuste } from '@/features/seguridad/api/funciones.api'

export type Borrador = Record<string, ValorAjuste>
export interface Conflicto {
  clave: string; funcion: string; nombre: string; rol: string
  anterior: ValorAjuste; guardado: ValorAjuste; propuesto: ValorAjuste
  bloqueado: boolean; motivo: string
}
export const claveFuncion = (funcion: string, rol: string) => `${funcion}|${rol}`
export function pareja(clave: string) {
  const separador = clave.lastIndexOf('|')
  return { funcion: clave.slice(0, separador), rol: clave.slice(separador + 1) }
}
export function ajuste(config: ConfiguracionFunciones, funcion: string, rol: string): ValorAjuste {
  return config.ajustes.find((a) => a.funcion === funcion && a.rol === rol)?.permitido ?? null
}
export function valorInicial(funcion: Funcion, rol: string) {
  return funcion.rolesIniciales.includes(rol)
}
export function valorSeleccionado(config: ConfiguracionFunciones, borrador: Borrador, funcion: Funcion, rol: string) {
  const clave = claveFuncion(funcion.id, rol)
  const valor = Object.hasOwn(borrador, clave) ? borrador[clave] : ajuste(config, funcion.id, rol)
  return valor ?? valorInicial(funcion, rol)
}
export function cambiarCelda(base: ConfiguracionFunciones, actual: Borrador, funcion: string, rol: string, valor: ValorAjuste): Borrador {
  const nueva = { ...actual }
  const clave = claveFuncion(funcion, rol)
  if (valor === ajuste(base, funcion, rol)) delete nueva[clave]
  else nueva[clave] = valor
  return nueva
}

/** Fusión por pareja función/rol; nunca transforma una reconsulta en un guardado. */
export function fusionarBorrador(base: ConfiguracionFunciones, servidor: ConfiguracionFunciones, local: Borrador) {
  const borrador: Borrador = {}
  const conflictos: Conflicto[] = []
  let coincidencias = 0
  for (const [clave, propuesto] of Object.entries(local)) {
    const { funcion, rol } = pareja(clave)
    const original = base.funciones.find((f) => f.id === funcion)
    const nueva = servidor.funciones.find((f) => f.id === funcion)
    const anterior = ajuste(base, funcion, rol)
    const guardado = ajuste(servidor, funcion, rol)
    const bloqueado = !nueva || !nueva.delegable || !servidor.roles.includes(rol)
    const cambioInicial = original && nueva && valorInicial(original, rol) !== valorInicial(nueva, rol)
    if (bloqueado || (cambioInicial && propuesto === null)) {
      conflictos.push({ clave, funcion, nombre: original?.nombre ?? funcion, rol, anterior, guardado, propuesto,
        bloqueado, motivo: bloqueado ? 'La función ya no está disponible para editar.' : 'Cambió el valor inicial de la función.' })
      borrador[clave] = propuesto
    } else if (guardado === propuesto) {
      coincidencias += 1
    } else if (guardado === anterior && !cambioInicial) {
      borrador[clave] = propuesto
    } else {
      conflictos.push({ clave, funcion, nombre: original?.nombre ?? funcion, rol, anterior, guardado, propuesto,
        bloqueado: false, motivo: 'Se modificó esta misma función y rol.' })
      borrador[clave] = propuesto
    }
  }
  return { borrador, conflictos, coincidencias }
}

export function cambiosParaGuardar(borrador: Borrador): CambioFuncion[] {
  return Object.entries(borrador).map(([clave, permitido]) => ({ ...pareja(clave), permitido }))
}
export function dependenciasFaltantes(base: ConfiguracionFunciones, borrador: Borrador) {
  const roles = new Set(Object.keys(borrador).map((clave) => pareja(clave).rol))
  return base.funciones.flatMap((f) => [...roles].flatMap((rol) => {
    if (!valorSeleccionado(base, borrador, f, rol)) return []
    return f.dependencias.flatMap((id) => {
      const dependencia = base.funciones.find((d) => d.id === id)
      return !dependencia || !valorSeleccionado(base, borrador, dependencia, rol)
        ? [{ rol, funcion: f.nombre, requiere: dependencia?.nombre ?? id }]
        : []
    })
  }))
}
