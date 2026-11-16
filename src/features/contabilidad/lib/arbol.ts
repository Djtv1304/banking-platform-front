import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'

/*
 * Árbol del plan de cuentas a partir de la lista plana de CON-03 (jerarquía por `idCuentaSuperior`).
 * Sin UI, para poder probarlo aparte.
 */

export interface NodoCuenta {
  cuenta: CuentaContable
  /** 1 en el primer nivel */
  nivel: number
  /** Padre dentro del árbol: null en el primer nivel (también los huérfanos y los ciclos cortados) */
  idPadre: number | null
  hijos: NodoCuenta[]
}

export interface ArbolCuentas {
  raices: NodoCuenta[]
  porId: Map<number, NodoCuenta>
}

const porCodigo = (a: CuentaContable, b: CuentaContable) =>
  a.codigoCuenta < b.codigoCuenta ? -1 : a.codigoCuenta > b.codigoCuenta ? 1 : a.idCuentaContable - b.idCuentaContable

/**
 * Hermanos ordenados por código. Una cuenta cuyo padre no llegó (huérfana) o que se apunta a sí
 * misma va al primer nivel. Si hay un ciclo (A → B → A), se corta en la cuenta de menor código,
 * que sube al primer nivel: ninguna cuenta se pierde ni se repite y el recorrido termina.
 */
export function construirArbol(cuentas: readonly CuentaContable[]): ArbolCuentas {
  const ids = new Set(cuentas.map((cuenta) => cuenta.idCuentaContable))
  const hijosDe = new Map<number, CuentaContable[]>()
  const candidatas: CuentaContable[] = []

  for (const cuenta of cuentas) {
    const padre = cuenta.idCuentaSuperior
    if (padre === null || padre === cuenta.idCuentaContable || !ids.has(padre)) {
      candidatas.push(cuenta)
      continue
    }
    const hermanos = hijosDe.get(padre)
    if (hermanos) hermanos.push(cuenta)
    else hijosDe.set(padre, [cuenta])
  }
  for (const hermanos of hijosDe.values()) hermanos.sort(porCodigo)

  const porId = new Map<number, NodoCuenta>()
  const raices: NodoCuenta[] = []

  const colgar = (cuenta: CuentaContable, nivel: number, idPadre: number | null): NodoCuenta => {
    const nodo: NodoCuenta = { cuenta, nivel, idPadre, hijos: [] }
    porId.set(cuenta.idCuentaContable, nodo)
    for (const hija of hijosDe.get(cuenta.idCuentaContable) ?? []) {
      if (!porId.has(hija.idCuentaContable)) nodo.hijos.push(colgar(hija, nivel + 1, cuenta.idCuentaContable))
    }
    return nodo
  }

  for (const cuenta of candidatas.sort(porCodigo)) raices.push(colgar(cuenta, 1, null))
  // Lo que queda sin colgar está en un ciclo
  for (const cuenta of [...cuentas].sort(porCodigo)) {
    if (!porId.has(cuenta.idCuentaContable)) raices.push(colgar(cuenta, 1, null))
  }
  if (raices.length > candidatas.length) raices.sort((a, b) => porCodigo(a.cuenta, b.cuenta))

  return { raices, porId }
}

/** Ids de las cuentas de primer nivel: el árbol arranca con ellas abiertas */
export const idsPrimerNivel = (raices: readonly NodoCuenta[]) => new Set(raices.map((nodo) => nodo.cuenta.idCuentaContable))

export interface FiltroArbol {
  texto: string
  soloImputables: boolean
}

export interface ResultadoFiltro {
  /** Las coincidencias y sus ancestros: lo único que se muestra */
  visibles: Set<number>
  coincidencias: Set<number>
  /** Los ancestros de cada coincidencia, para abrirlos */
  abiertos: Set<number>
}

/** Minúsculas y sin tildes: «Depósitos» coincide con «depositos» */
export const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/**
 * Búsqueda por el inicio del código (se ignoran puntos, guiones y espacios: «1.1.01» = «1101») o
 * por parte del nombre, y filtro de solo imputables. null si no hay ningún filtro activo.
 */
export function filtrarArbol(raices: readonly NodoCuenta[], filtro: FiltroArbol): ResultadoFiltro | null {
  const texto = normalizar(filtro.texto)
  if (!texto && !filtro.soloImputables) return null
  const codigo = texto.replace(/[.\s-]/g, '')

  const coincide = ({ cuenta }: NodoCuenta) =>
    (!filtro.soloImputables || cuenta.esImputable) &&
    (!texto || (codigo !== '' && cuenta.codigoCuenta.startsWith(codigo)) || normalizar(cuenta.nombreCuenta).includes(texto))

  const resultado: ResultadoFiltro = { visibles: new Set(), coincidencias: new Set(), abiertos: new Set() }
  const recorrer = (nodo: NodoCuenta, ancestros: number[]) => {
    const id = nodo.cuenta.idCuentaContable
    if (coincide(nodo)) {
      resultado.coincidencias.add(id)
      resultado.visibles.add(id)
      for (const ancestro of ancestros) {
        resultado.visibles.add(ancestro)
        resultado.abiertos.add(ancestro)
      }
    }
    ancestros.push(id)
    for (const hijo of nodo.hijos) recorrer(hijo, ancestros)
    ancestros.pop()
  }
  for (const raiz of raices) recorrer(raiz, [])
  return resultado
}

/** Hijos que se muestran: todos sin filtro; con filtro, solo los visibles */
export const hijosVisibles = (nodo: NodoCuenta, visibles: ReadonlySet<number> | null) =>
  visibles ? nodo.hijos.filter((hijo) => visibles.has(hijo.cuenta.idCuentaContable)) : nodo.hijos

export interface FilaArbol {
  nodo: NodoCuenta
  /** Posición entre sus hermanos visibles (1…total), para aria-posinset y aria-setsize */
  posicion: number
  total: number
  tieneHijos: boolean
  abierto: boolean
}

/**
 * Filas en el orden en que se ven, sin entrar en las ramas cerradas: con 1.182 cuentas solo se
 * recorre y se pinta lo abierto. Es también el orden del teclado (↑/↓, Inicio, Fin).
 */
export function aplanarVisibles(
  raices: readonly NodoCuenta[],
  abiertos: ReadonlySet<number>,
  visibles: ReadonlySet<number> | null,
): FilaArbol[] {
  const filas: FilaArbol[] = []
  const agregar = (hermanos: readonly NodoCuenta[]) => {
    hermanos.forEach((nodo, indice) => {
      const hijos = hijosVisibles(nodo, visibles)
      const abierto = hijos.length > 0 && abiertos.has(nodo.cuenta.idCuentaContable)
      filas.push({ nodo, posicion: indice + 1, total: hermanos.length, tieneHijos: hijos.length > 0, abierto })
      if (abierto) agregar(hijos)
    })
  }
  agregar(visibles ? raices.filter((raiz) => visibles.has(raiz.cuenta.idCuentaContable)) : raices)
  return filas
}

export type AccionTeclado =
  | { tipo: 'enfocar'; id: number }
  | { tipo: 'abrir'; id: number }
  | { tipo: 'cerrar'; id: number }
  | { tipo: 'seleccionar'; id: number }

/**
 * Patrón WAI-ARIA Tree View: ↑/↓ mueven, → abre o baja al primer hijo, ← cierra o sube al padre,
 * Inicio/Fin van a la primera o la última fila, Intro/Espacio seleccionan. null = tecla sin efecto.
 */
export function accionTeclado(filas: readonly FilaArbol[], idActual: number, tecla: string): AccionTeclado | null {
  const indice = filas.findIndex((fila) => fila.nodo.cuenta.idCuentaContable === idActual)
  if (indice < 0 || filas.length === 0) return null
  const fila = filas[indice]
  const enfocar = (destino: FilaArbol | undefined) =>
    destino ? ({ tipo: 'enfocar', id: destino.nodo.cuenta.idCuentaContable } as const) : null

  switch (tecla) {
    case 'ArrowDown':
      return enfocar(filas[indice + 1])
    case 'ArrowUp':
      return enfocar(filas[indice - 1])
    case 'Home':
      return enfocar(filas[0])
    case 'End':
      return enfocar(filas[filas.length - 1])
    case 'ArrowRight':
      if (!fila.tieneHijos) return null
      // Abierta: su primer hijo es la fila siguiente
      return fila.abierto ? enfocar(filas[indice + 1]) : { tipo: 'abrir', id: idActual }
    case 'ArrowLeft': {
      if (fila.abierto) return { tipo: 'cerrar', id: idActual }
      const { idPadre } = fila.nodo
      return idPadre === null ? null : enfocar(filas.find((otra) => otra.nodo.cuenta.idCuentaContable === idPadre))
    }
    case 'Enter':
    case ' ':
      return { tipo: 'seleccionar', id: idActual }
    default:
      return null
  }
}
