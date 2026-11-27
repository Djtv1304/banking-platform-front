import type { Verificacion } from '@/features/auditoria/api/auditoria.contract'
import type { TonoInsignia } from '@/shared/ui'

export function tonoResultado(resultado: string | null): TonoInsignia {
  if (resultado === 'Exitoso') return 'exito'
  if (resultado === 'Fallido') return 'peligro'
  return 'neutro'
}

export function tonoSeveridad(severidad: string | null): TonoInsignia {
  if (severidad === 'Sensible') return 'advertencia'
  if (severidad === 'Seguridad') return 'info'
  return 'neutro'
}

/** La bitácora guarda UTC; el servidor envía también la hora de Ecuador con su desfase (-05:00). */
export function textoFechaLocal(fechaHoraLocal: string | null): string {
  if (!fechaHoraLocal) return '—'
  return fechaHoraLocal.slice(0, 19).replace('T', ' ') + ' (hora de Ecuador)'
}

/** Fecha de hoy (o desplazada en días) en el calendario de Ecuador, como YYYY-MM-DD. */
export function fechaEcuador(dias = 0, ahora = new Date()): string {
  const fecha = new Date(ahora.getTime() + dias * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(fecha)
}

/** Texto del resultado: la primera secuencia rota es lo que el auditor necesita investigar. */
export function textoResultado(v: Pick<Verificacion, 'resultado' | 'primeraRota'>): string {
  return v.resultado === 'Integra' ? 'Íntegra' : `Rota desde la secuencia ${v.primeraRota ?? '—'}`
}
