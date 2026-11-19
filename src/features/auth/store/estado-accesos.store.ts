import { create } from 'zustand'

export const useEstadoAccesos = create<{ fallo: boolean }>(() => ({ fallo: false }))
