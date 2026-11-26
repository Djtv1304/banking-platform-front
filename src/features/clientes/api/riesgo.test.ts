import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiClient } from '@/shared/api'
import {
  accesoRiesgo,
  fechaRiesgoVisible,
  formatearFechaVigencia,
  listarRiesgos,
  listarTiposAntecedente,
  registrarEvaluacion,
  riesgoCreateSchema,
  validezEvaluacion,
} from '@/features/clientes/api/riesgo'

const entrada = { nivelRiesgoLAFT: 'Bajo' as const, esPEP: false, resultadoEvaluacion: 'Aprobado' as const, tieneAntecedentes: false, idTipoAntecedente: null, observaciones: 'Revisión ficticia' }
const evaluacion = { ...entrada, idEvaluacion: 1, idCliente: 1043, fechaEvaluacion: '2026-11-11T12:00:00Z', evaluador: 1, esVigente: true, vigenteHasta: '2027-11-11', idSolicitud: null }
const respuesta = (data: unknown, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
afterEach(() => vi.restoreAllMocks())

describe('C-08 contrato y permisos', () => {
  it('muestra Ecuador para fechas con zona y conserva el significado de fechas sin zona', () => {
    expect(fechaRiesgoVisible('2026-11-12T00:30:00Z')).toContain('11 nov 2026')
    expect(fechaRiesgoVisible('2026-11-11T12:00:00')).toContain('sin zona informada')
  })
  it.each(['ASESOR', 'SUPERVISOR', 'ADMIN'])('%s consulta; registra solo con clientes:riesgo', (rol) => {
    expect(accesoRiesgo([rol])).toEqual({ registro: false, historial: true })
    expect(accesoRiesgo([rol], ['clientesRiesgo'])).toEqual({ registro: true, historial: true })
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
  it('calcula la validez de la evaluación según la fecha de vigencia', () => {
    const ref = new Date('2026-11-25T12:00:00Z')
    expect(validezEvaluacion('2027-11-25', ref)).toBe('Vigente hasta 25/11/2027')
    expect(validezEvaluacion('2026-11-20', ref)).toBe('Vencida')
    expect(validezEvaluacion(null, ref)).toBeNull()
    expect(validezEvaluacion(undefined, ref)).toBeNull()
    expect(formatearFechaVigencia('2027-11-25')).toBe('25/11/2027')
    expect(formatearFechaVigencia(null)).toBe('—')
    expect(formatearFechaVigencia(undefined)).toBe('—')
  })
})

describe('C-08 transporte', () => {
  it('consulta el historial con cancelación y conserva vigencia, evaluador y solicitud', async () => {
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
  it('envía únicamente campos de evaluación y usa estadoCliente del servidor en 201', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta({ ...evaluacion, estadoCliente: 'Bloqueado' }, 201))
    const res = await registrarEvaluacion(1043, { ...entrada, evaluador: 999 } as typeof entrada)
    expect(res).toEqual({
      tipo: 'registrada',
      evaluacion: { ...evaluacion, estadoCliente: 'Bloqueado' },
    })
    expect(post).toHaveBeenCalledWith('/api/v1/clientes/1043/evaluaciones-riesgo', entrada)
  })
  it('procesa respuesta 202 que requiere aprobación con solicitud', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta({ idSolicitud: 402, estado: 'Pendiente', requiereAprobacion: true }, 202))
    const res = await registrarEvaluacion(1043, { ...entrada, nivelRiesgoLAFT: 'Alto' })
    expect(res).toEqual({ tipo: 'solicitud', idSolicitud: 402 })
    expect(post).toHaveBeenCalledWith('/api/v1/clientes/1043/evaluaciones-riesgo', { ...entrada, nivelRiesgoLAFT: 'Alto' })
  })
  it('rechaza respuesta 202 mal formada con respuesta_invalida', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta({ idSolicitud: 'invalido' }, 202))
    await expect(registrarEvaluacion(1043, entrada)).rejects.toMatchObject({
      code: 'respuesta_invalida',
      status: 202,
      message: 'No pudimos leer la respuesta del servidor.',
    })
  })
  it('propaga error 409 EVALUACION_PENDIENTE tal cual para mostrar su mensaje', async () => {
    const error409 = new ApiError('Ya existe una evaluación de riesgo pendiente de aprobación para este cliente.', 409, 'EVALUACION_PENDIENTE')
    vi.spyOn(apiClient, 'post').mockRejectedValue(error409)
    await expect(registrarEvaluacion(1043, entrada)).rejects.toMatchObject({
      code: 'EVALUACION_PENDIENTE',
      status: 409,
      message: 'Ya existe una evaluación de riesgo pendiente de aprobación para este cliente.',
    })
  })
  it('rechaza éxito ambiguo y propaga los errores sin repetir POST', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce(respuesta({ ...evaluacion, estadoCliente: 'Activo' }, 200)).mockRejectedValueOnce(new Error('Fallo'))
    await expect(registrarEvaluacion(1043, entrada)).rejects.toMatchObject({ code: 'respuesta_invalida' })
    await expect(registrarEvaluacion(1043, entrada)).rejects.toThrow('Fallo')
    expect(post).toHaveBeenCalledTimes(2)
  })
  it('lee CAT-04 y conserva la advertencia de vinculación', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta([{ idTipoAntecedente: 2, nombre: 'Prueba', categoria: 'Critico', puedeImpedirVinculacion: true }]))
    expect((await listarTiposAntecedente())[0].puedeImpedirVinculacion).toBe(true)
  })
})
