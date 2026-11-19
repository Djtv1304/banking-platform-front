import type { DetalleSolicitud } from '@/features/aprobaciones/api/aprobaciones.contract'
import { ALGORITMOS } from '@/features/organizacion/api/numeracion.contract'
import { ComparadorCambios } from '@/shared/ui/comparador-cambios'

function formato(datos: Record<string, unknown>) {
  const f = datos.formato && typeof datos.formato === 'object' ? datos.formato as Record<string, unknown> : {}
  return { Prefijo: f.prefijo, 'Incluir codigo de agencia': f.incluyeAgencia, 'Digitos de secuencia': f.longitudSecuencia, 'Algoritmo verificador': f.algoritmoVerificador == null ? undefined : ALGORITMOS[f.algoritmoVerificador as keyof typeof ALGORITMOS] ?? 'No disponible' }
}
export function ResumenNumeracion({ solicitud: s }: { solicitud: DetalleSolicitud }) {
  const sub = s.despues.subproducto && typeof s.despues.subproducto === 'object' ? s.despues.subproducto as Record<string, unknown> : {}
  return <section aria-label="Cambio propuesto" className="space-y-4 rounded-2xl border border-border bg-card p-5"><h2 className="text-xl font-semibold">Regla de numeracion de {typeof sub.nombre === 'string' ? sub.nombre : 'la cuenta'}</h2><ComparadorCambios antes={formato(s.antes)} despues={formato(s.despues)} />{s.estado === 'Pendiente' && <p className="text-sm text-muted-foreground">La regla se aplicara cuando otra persona autorizada la apruebe.</p>}</section>
}
