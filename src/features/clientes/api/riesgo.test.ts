import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/api'
import { accesoRiesgo, fechaRiesgoVisible, listarRiesgos, listarTiposAntecedente, registrarRiesgo, riesgoCreateSchema } from '@/features/clientes/api/riesgo'

const entrada = { nivelRiesgoLAFT: 'Bajo' as const, esPEP: false, resultadoEvaluacion: 'Aprobado' as const, tieneAntecedentes: false, idTipoAntecedente: null, observaciones: 'Revisión ficticia' }
const evaluacion = { ...entrada, idEvaluacion: 1, idCliente: 1043, fechaEvaluacion: '2026-11-11T12:00:00Z', evaluador: 1, esVigente: true }
const respuesta = (data: unknown, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
afterEach(() => vi.restoreAllMocks())

describe('C-08 contrato y permisos', () => {
  it('muestra Ecuador para fechas con zona y conserva el significado de fechas sin zona', () => {
    expect(fechaRiesgoVisible('2026-11-12T00:30:00Z')).toContain('11 nov 2026')
    expect(fechaRiesgoVisible('2026-11-11T12:00:00')).toContain('sin zona informada')
  })
  it.each(['ASESOR', 'SUPERVISOR', 'ADMIN'])('%s registra y consulta', (rol) => {
    expect(accesoRiesgo([rol])).toEqual({ registro: true, historial: true })
  })
  it('AUDITOR solo consulta, CAJERO y perfiles desconocidos carecen de acceso', () => {
    expect(accesoRiesgo([' auditor '])).toEqual({ registro: false, historial: true })
    expect(accesoRiesgo(['CAJERO'])).toEqual({ registro: false, historial: false })
    expect(accesoRiesgo([])).toEqual({ registro: false, historial: false })
  })
  it('exige un tipo cuando hay antecedentes y rechaza un tipo sin antecedentes', () => {
    expect(riesgoCreateSchema.safeParse({ ...entrada, tieneAntecedentes: true }).success).toBe(false)
    expect(riesgoCreateSchema.safeParse({ ...entrada, idTipoAntecedente: 2 }).success).toBe(false)
    expect(riesgoCreateSchema.safeParse({ ...entrada, tieneAntecedentes: true, idTipoAntecedente: 2 }).success).toBe(true)
  })
  it('acepta decisiones explícitas y limita observaciones al contrato', () => {
    expect(riesgoCreateSchema.safeParse({ ...entrada, nivelRiesgoLAFT: '' }).success).toBe(false)
    expect(riesgoCreateSchema.safeParse({ ...entrada, observaciones: 'a'.repeat(251) }).success).toBe(false)
    expect(riesgoCreateSchema.parse({ ...entrada, observaciones: '  Sustento  ' }).observaciones).toBe('Sustento')
  })
})

describe('C-08 transporte', () => {
  it('consulta el historial con cancelación y conserva vigencia y evaluador', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta([evaluacion]))
    const signal = new AbortController().signal
    expect(await listarRiesgos(1043, signal)).toEqual([evaluacion])
    expect(get).toHaveBeenCalledWith('/api/v1/clientes/1043/evaluaciones-riesgo', { signal })
  })
  it('admite historial vacío y rechaza HTML o datos de otro cliente', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValueOnce(respuesta([])).mockResolvedValueOnce(respuesta('<html>SPA</html>')).mockResolvedValueOnce(respuesta([{ ...evaluacion, idCliente: 999 }]))
    await expect(listarRiesgos(1043)).resolves.toEqual([])
    await expect(listarRiesgos(1043)).rejects.toMatchObject({ code: 'respuesta_invalida' })
    await expect(listarRiesgos(1043)).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })
  it('envía únicamente campos de evaluación y usa estadoCliente del servidor', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta({ ...evaluacion, estadoCliente: 'Bloqueado' }, 201))
    expect((await registrarRiesgo(1043, { ...entrada, evaluador: 999 } as typeof entrada)).estadoCliente).toBe('Bloqueado')
    expect(post).toHaveBeenCalledWith('/api/v1/clientes/1043/evaluaciones-riesgo', entrada)
  })
  it('rechaza éxito ambiguo y propaga los errores sin repetir POST', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(respuesta({ ...evaluacion, estadoCliente: 'Activo' }, 200)).mockRejectedValueOnce(new Error('Fallo'))
    await expect(registrarRiesgo(1043, entrada)).rejects.toMatchObject({ code: 'respuesta_invalida' })
    await expect(registrarRiesgo(1043, entrada)).rejects.toThrow('Fallo')
    expect(post).toHaveBeenCalledTimes(2)
  })
  it('lee CAT-04 y conserva la advertencia de vinculación', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta([{ idTipoAntecedente: 2, nombre: 'Prueba', categoria: 'Critico', puedeImpedirVinculacion: true }]))
    expect((await listarTiposAntecedente())[0].puedeImpedirVinculacion).toBe(true)
  })
})
