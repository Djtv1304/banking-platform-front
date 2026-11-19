import { useEffect } from 'react'
import { useInstitucion } from '@/shared/institucion/useInstitucion'

export function InstitucionDocumentTitle() {
  const { nombre } = useInstitucion()
  useEffect(() => {
    document.title = nombre === 'Sistema de gestión' ? nombre : `${nombre} · Sistema de gestión`
  }, [nombre])
  return null
}
