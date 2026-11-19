import { renderToStaticMarkup } from 'react-dom/server'
import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'

import { toApiError } from '@/shared/api'
import { ErrorApi } from '@/shared/ui/error-api'

function errorAxios(status: number, data: unknown, cabeceras: Record<string, string> = {}) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('fallo', 'ERR', config, null, { status, statusText: '', data, headers: cabeceras, config })
}

describe('código de soporte (E0-13)', () => {
  it('muestra el traceId del cuerpo con la opción de copiarlo', () => {
    const html = renderToStaticMarkup(<ErrorApi error={errorAxios(500, { title: 'Error interno', traceId: '3a31454c-da47-4d91-86c2-f42ba73d02e4' })} />)
    expect(html).toContain('Código de soporte')
    expect(html).toContain('3a31454c-da47-4d91-86c2-f42ba73d02e4')
    expect(html).toContain('Copiar')
  })

  it('si el cuerpo no lo trae, lo toma de la cabecera X-Request-Id', () => {
    const error = toApiError(errorAxios(422, { detail: [{ msg: 'campo requerido' }] }, { 'x-request-id': 'req-12345678' }))
    expect(error.traceId).toBe('req-12345678')
  })

  it('descarta un id con forma insegura y no muestra el código', () => {
    const error = errorAxios(500, { title: 'Error', traceId: '<script>alert(1)</script>' })
    expect(toApiError(error).traceId).toBeUndefined()
    expect(renderToStaticMarkup(<ErrorApi error={error} />)).not.toContain('Código de soporte')
  })
})
