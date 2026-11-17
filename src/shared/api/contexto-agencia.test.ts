import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { apiClient, fijarContextoAgencia, limpiarContextoAgencia } from '@/shared/api/client'

const adapterOriginal = apiClient.defaults.adapter
const peticiones: InternalAxiosRequestConfig[] = []
const adapter: AxiosAdapter = async (config) => {
  peticiones.push(config)
  return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
}
beforeEach(() => { peticiones.length = 0; limpiarContextoAgencia(); apiClient.defaults.adapter = adapter })
afterEach(() => { apiClient.defaults.adapter = adapterOriginal; limpiarContextoAgencia() })

describe('precondicion de agencia confirmada por el BFF', () => {
  it('conserva el contexto de la pagina aunque una renovacion lea otra agencia', async () => {
    fijarContextoAgencia('001')
    fijarContextoAgencia('002')
    await apiClient.post('/prueba-local', {})
    expect(peticiones[0].headers.get('X-Agencia-Contexto')).toBe('001')
  })
  it('una pagina sin contexto no inventa una agencia ni manda autorizacion', async () => {
    fijarContextoAgencia(null)
    await apiClient.post('/prueba-local', {})
    expect(peticiones[0].headers.get('X-Agencia-Contexto')).toBe('global')
    expect(peticiones[0].headers.has('Authorization')).toBe(false)
  })
  it('limpia el contexto al terminar sesion y no lo envia en consultas', async () => {
    fijarContextoAgencia('001')
    limpiarContextoAgencia()
    fijarContextoAgencia('002')
    await apiClient.get('/prueba-local')
    await apiClient.patch('/prueba-local', {})
    expect(peticiones[0].headers.has('X-Agencia-Contexto')).toBe(false)
    expect(peticiones[1].headers.get('X-Agencia-Contexto')).toBe('002')
  })
})
