import { create } from 'zustand'

/**
 * E4-04 · Reversos pedidos en esta sesión. El original sigue CONTABILIZADO hasta que otra persona
 * aprueba el reverso, y el asiento no trae ese dato: sin esto, «Solicitar reverso» volvería a salir
 * al reabrir el detalle. Al recargar la página se olvida y el backend responde si ya hay uno pendiente.
 */
const useReversosSolicitados = create<{ ids: ReadonlySet<number> }>(() => ({ ids: new Set() }))

export const reversoFueSolicitado = (idAsiento: number) => useReversosSolicitados.getState().ids.has(idAsiento)

export const useReversoSolicitado = (idAsiento: number) => useReversosSolicitados((estado) => estado.ids.has(idAsiento))

export const marcarReversoSolicitado = (idAsiento: number) =>
  useReversosSolicitados.setState((estado) => ({ ids: new Set(estado.ids).add(idAsiento) }))

export const olvidarReversosSolicitados = () => useReversosSolicitados.setState({ ids: new Set() })
