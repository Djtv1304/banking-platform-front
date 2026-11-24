import { useState } from 'react'
import { Download } from 'lucide-react'

import { useAuthStore } from '@/features/auth'
import { apiClient, toApiError } from '@/shared/api'
import { Aviso, Button } from '@/shared/ui'

interface ExportarCsvButtonProps {
  ruta: string
  parametros: Record<string, string>
  archivo: string
  etiqueta?: string
}

export function ExportarCsvButton({ ruta, parametros, archivo, etiqueta = 'Exportar CSV' }: ExportarCsvButtonProps) {
  const autorizado = useAuthStore((state) => state.user?.permisos.includes('org-exportar') ?? false)
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!autorizado) return null

  const exportar = async () => {
    setPendiente(true)
    setError(null)
    try {
      const { data, headers } = await apiClient.get<unknown>(ruta, { params: { ...parametros, formato: 'csv' } })
      if (typeof data !== 'string' || !String(headers['content-type']).startsWith('text/csv')) {
        setError('El servidor no devolvió un archivo CSV.')
        return
      }
      const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }))
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = archivo
      enlace.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
    } catch (fallo) {
      setError(toApiError(fallo).message)
    } finally {
      setPendiente(false)
    }
  }

  return <div className="flex flex-col gap-2">
    <Button type="button" variant="outline" disabled={pendiente} onClick={() => void exportar()}>
      <Download aria-hidden />
      {pendiente ? 'Preparando CSV…' : etiqueta}
    </Button>
    {error && <Aviso tono="error">{error}</Aviso>}
  </div>
}
