import type { Solicitud } from '@/features/aprobaciones/api/aprobaciones.contract'
export function responsable(s: Solicitud['solicitante']) { return `${s.nombre ?? s.sujeto}${s.idInterno != null ? `(${s.idInterno})` : ''}` }
