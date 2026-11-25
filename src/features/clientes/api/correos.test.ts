import { AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/shared/api'
import {
  agregarCorreo, clienteEmailNuevoSchema, correosClienteKey, eliminarCorreo, listarCorreos,
  verificarCorreoPrincipal, verificarCorreoSecundario,
} from '@/features/clientes/api/correos'

const correo = {
  idClienteEmail: 5, email: 'trabajo@ejemplo.com', etiqueta: 'Trabajo', verificado: false,
  fechaVerificacion: null, fechaCreacion: '2026-11-20T10:00:00Z',
}
const respuesta = (data: unknown, status = 200) => ({ data, status, statusText: 'OK', headers: {}, config: { headers: new AxiosHeaders() } })
afterEach(() => vi.restoreAllMocks())

describe('E5-04 correos del cliente', () => {
  it('lista con cancelación y valida la respuesta', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta([correo]))
    const signal = new AbortController().signal
    await expect(listarCorreos(1042, signal)).resolves.toEqual([correo])
    expect(get).toHaveBeenCalledWith('/api/v1/clientes/1042/emails', { signal })
  })

  it('rechaza HTML con 200 como respuesta inválida', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue(respuesta('<html>Sin backend</html>'))
    await expect(listarCorreos(1042)).rejects.toMatchObject({ code: 'respuesta_invalida', status: 200, message: 'No pudimos leer la respuesta del servidor.' })
  })

  it('agrega en minúsculas, sin espacios y solo con los campos del contrato', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta(correo, 201))
    await expect(agregarCorreo(1042, { email: '  Trabajo@Ejemplo.COM ', etiqueta: ' Trabajo ' })).resolves.toEqual(correo)
    expect(post).toHaveBeenCalledWith('/api/v1/clientes/1042/emails', { email: 'trabajo@ejemplo.com', etiqueta: 'Trabajo' })
  })

  it('valida el cuerpo antes de enviar', () => {
    expect(clienteEmailNuevoSchema.safeParse({ email: 'no-es-correo', etiqueta: 'Casa' }).success).toBe(false)
    expect(clienteEmailNuevoSchema.safeParse({ email: 'a@b.co', etiqueta: '   ' }).success).toBe(false)
    expect(clienteEmailNuevoSchema.safeParse({ email: 'a@b.co', etiqueta: 'x'.repeat(31) }).success).toBe(false)
    expect(clienteEmailNuevoSchema.safeParse({ email: 'a@b.co', etiqueta: 'Ca\u0007sa' }).success).toBe(false)
    expect(clienteEmailNuevoSchema.safeParse({ email: `${'a'.repeat(145)}@b.com`, etiqueta: 'Casa' }).success).toBe(false)
    expect(clienteEmailNuevoSchema.safeParse({ email: 'a@b.co', etiqueta: 'Casa', extra: 1 }).success).toBe(false)
  })

  it('no envía el alta si el cuerpo es inválido', async () => {
    const post = vi.spyOn(apiClient, 'post')
    await expect(agregarCorreo(1042, { email: 'mal', etiqueta: 'Casa' })).rejects.toThrow()
    expect(post).not.toHaveBeenCalled()
  })

  it('quita sin interpretar el body 204', async () => {
    const eliminar = vi.spyOn(apiClient, 'delete').mockResolvedValue(respuesta('', 204))
    await expect(eliminarCorreo(1042, 5)).resolves.toBeUndefined()
    expect(eliminar).toHaveBeenCalledWith('/api/v1/clientes/1042/emails/5')
  })

  it('marca como verificado el correo principal sin body', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(respuesta({ emailVerificado: true, fechaEmailVerificado: '2026-11-24T09:00:00Z' }))
    await expect(verificarCorreoPrincipal(1042)).resolves.toMatchObject({ emailVerificado: true })
    expect(post).toHaveBeenCalledWith('/api/v1/clientes/1042/email/verificacion')
  })

  it('marca como verificado un correo secundario y valida la respuesta', async () => {
    const post = vi.spyOn(apiClient, 'post')
      .mockResolvedValueOnce(respuesta({ ...correo, verificado: true, fechaVerificacion: '2026-11-24T09:00:00Z' }))
      .mockResolvedValueOnce(respuesta({ ok: true }))
    await expect(verificarCorreoSecundario(1042, 5)).resolves.toMatchObject({ verificado: true })
    expect(post).toHaveBeenCalledWith('/api/v1/clientes/1042/emails/5/verificacion')
    await expect(verificarCorreoSecundario(1042, 5)).rejects.toMatchObject({ code: 'respuesta_invalida' })
  })

  it('propaga los errores del backend', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue({ status: 409, code: 'EMAIL_YA_VERIFICADO' })
    await expect(verificarCorreoPrincipal(1042)).rejects.toMatchObject({ status: 409, code: 'EMAIL_YA_VERIFICADO' })
  })

  it('usa una clave de caché bajo el prefijo de clientes', () => {
    expect(correosClienteKey(7)).toEqual(['clientes', 'correos', 7])
  })
})
