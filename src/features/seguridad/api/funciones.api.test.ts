import { describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/api'
import { configuracionFuncionesSchema, consultarFunciones, guardarFunciones } from '@/features/seguridad/api/funciones.api'

const config = {
  version: 'a'.repeat(64), activa: true, modelo: 'FUNCIONES_POR_ROL',
  roles: ['ADMIN'], ajustes: [],
  funciones: [{ id: 'clientes.consultar', nombre: 'Consultar', modulo: 'Clientes', rutas: [],
    rolesIniciales: ['ADMIN'], delegable: true, motivoProteccion: null, dependencias: [] }],
}

describe('Contrato del editor de funciones', () => {
  it('rechaza HTML y respuestas incompletas aunque HTTP sea 200', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ status: 200, data: '<html>SPA</html>' })
    try { await expect(consultarFunciones()).rejects.toMatchObject({ code: 'respuesta_invalida' }) }
    finally { get.mockRestore() }
  })

  it('no declara guardado confirmado si falta el recibo del backend', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ status: 200, data: config })
    try {
      await expect(guardarFunciones({ version: config.version, motivo: 'Motivo de prueba', cambios: [] }))
        .rejects.toMatchObject({ code: 'resultado_no_confirmado' })
    } finally { patch.mockRestore() }
  })

  it('rechaza funciones duplicadas y ajustes ajenos al catálogo', () => {
    expect(configuracionFuncionesSchema.safeParse({ ...config, funciones: [...config.funciones, ...config.funciones] }).success).toBe(false)
    expect(configuracionFuncionesSchema.safeParse({ ...config, ajustes: [{ funcion: 'otra.funcion', rol: 'ADMIN', permitido: true }] }).success).toBe(false)
  })

  it('envía solo los cambios explícitos y valida la confirmación', async () => {
    const body = { version: config.version, motivo: 'Motivo de prueba', cambios: [{ funcion: 'clientes.consultar', rol: 'ADMIN', permitido: false }] }
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ status: 200, data: { ...config, estado: 'GUARDADO', cambiosAplicados: 1 } })
    try {
      expect((await guardarFunciones(body)).cambiosAplicados).toBe(1)
      expect(patch).toHaveBeenCalledWith('/api/v1/seguridad/accesos/configuracion', body)
    } finally { patch.mockRestore() }
  })
})
