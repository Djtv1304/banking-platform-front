import { Link } from 'react-router'

import { Aviso } from '@/shared/ui/aviso'

export function AvisoRequiereAprobacion({ idSolicitud }: { idSolicitud: number }) {
  return <Aviso>Solicitud #{idSolicitud} pendiente de aprobacion. El cambio aun no se aplica.<Link className="font-medium text-link underline" to={`/aprobaciones/${idSolicitud}`}>Consultar solicitud</Link></Aviso>
}
