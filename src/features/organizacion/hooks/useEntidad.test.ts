import { expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { confirmarEntidadEnCache } from '@/features/organizacion/hooks/useEntidad'
import { INSTITUCION_KEY } from '@/shared/institucion'

it('invalida la presentación después de confirmar el guardado de Entidad', async () => {
  const cache = new QueryClient()
  cache.setQueryData(INSTITUCION_KEY, { nombre: 'Nombre anterior' })
  await confirmarEntidadEnCache(cache, {} as Parameters<typeof confirmarEntidadEnCache>[1])
  expect(cache.getQueryState(INSTITUCION_KEY)?.isInvalidated).toBe(true)
  cache.clear()
})
