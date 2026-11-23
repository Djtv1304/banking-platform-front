import { traducirErrorPlantilla } from '@/features/contabilidad/lib/plantillas'
import { ErrorApi } from '@/shared/ui'

export function ErrorPlantilla({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  const respuesta = traducirErrorPlantilla(error)
  return <>
    <ErrorApi error={respuesta} reintentar={reintentar} />
    {respuesta.fields.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
      {respuesta.fields.map(({ field, message }, indice) => <li key={`${field}-${indice}`}>{field}. {message}</li>)}
    </ul>}
  </>
}
