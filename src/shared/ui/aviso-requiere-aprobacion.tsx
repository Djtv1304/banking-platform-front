import { Link } from 'react-router'

import { Aviso } from '@/shared/ui/aviso'

export function AvisoRequiereAprobacion({ idSolicitud }: { idSolicitud: number }) {
  return <Aviso>Solicitud #{idSolicitud} pendiente de aprobación. El cambio aún no se aplica.<Link className="w-fit rounded font-medium text-link underline focus-visible:outline-2" to={`/aprobaciones/${idSolicitud}`}>Consultar solicitud</Link></Aviso>
}
