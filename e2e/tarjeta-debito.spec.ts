import { expect, test } from '@playwright/test'

test('E6-10 aprueba, registra el despacho y activa tras verificar la entrega', async ({ page }, info) => {
  const fecha = '2026-11-25T20:00:00Z'
  const tarjeta = {
    idTarjeta: 301,
    idCuenta: 10,
    idCliente: 2,
    idProducto: 4,
    tipoTarjeta: 'Debito',
    nombreTarjeta: 'CLIENTE DE PRUEBA',
    numeroEnmascarado: '5000 00** **** 1234',
    estadoActual: 'Solicitada',
    esExtension: false,
    idTarjetaTitular: null,
    pinAsignado: false,
    fechaSolicitud: '2026-11-25',
    fechaResolucion: null as string | null,
    fechaEmision: '2026-11-25',
    fechaExpiracion: '2031-11-25',
    sobreDescargadoEn: null as string | null,
    envio: {
      idTarjeta: 301, estadoEnvio: 'Pendiente', codigoSeguimiento: null as string | null,
      despachadoEn: null as string | null,
    },
  }
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const ruta = new URL(request.url()).pathname
    const json = (datos: unknown) => route.fulfill({ json: datos })
    if (ruta.endsWith('/auth/me')) return json({
      idUsuario: 'user_e610',
      nombre: 'Operador de prueba',
      email: 'e610@example.invalid',
      idOrganizacion: 'org_e610',
      roles: ['SUPERVISOR', 'ASESOR'],
      permisos: ['tar-consultar', 'tar-estado', 'tar-solicitar:aprobar', 'tar-pin', 'tar-pin:entregar'],
      idAgencia: '001',
    })
    if (ruta.endsWith('/auth/refresh')) return route.fulfill({ status: 204 })
    if (ruta.endsWith('/institucion')) return json({ nombre: 'Cooperativa QA', sitioWeb: null, logoUrl: null, origen: 'ENTIDAD' })
    if (ruta.endsWith('/aprobaciones/accesos')) return json({ puedeVer: true, puedeSolicitar: false, pendientesParaMi: 0, diasResaltar: 30 })
    if (ruta.endsWith('/tarjetas/301')) return json(tarjeta)
    if (ruta.endsWith('/historial') || ruta.endsWith('/notificaciones')) return json({ items: [], total: 0 })
    if (ruta.endsWith('/tarjetas/301/estado')) {
      const datos = request.postDataJSON()
      if (datos.estado === 'Aprobada') {
        tarjeta.estadoActual = 'Generada'
        tarjeta.fechaResolucion = fecha
        tarjeta.pinAsignado = true
      } else {
        expect(datos).toMatchObject({ estado: 'Activa', documentoVerificado: true })
        expect(tarjeta.envio.estadoEnvio).toBe('Despachado')
        expect(tarjeta.sobreDescargadoEn).toBe(fecha)
        tarjeta.estadoActual = 'Activa'
        tarjeta.envio.estadoEnvio = 'Entregado'
      }
      return json(tarjeta)
    }
    if (ruta.endsWith('/tarjetas/301/envio')) {
      expect(request.postDataJSON()).toEqual({ codigoSeguimiento: 'GUIA-301' })
      tarjeta.envio = { ...tarjeta.envio, estadoEnvio: 'Despachado', codigoSeguimiento: 'GUIA-301', despachadoEn: fecha }
      return json(tarjeta.envio)
    }
    if (ruta.endsWith('/sobre-pin')) {
      tarjeta.sobreDescargadoEn = fecha
      return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.7' })
    }
    return route.fulfill({ status: 404, json: { code: 'FUERA_DEL_ESCENARIO' } })
  })

  await page.goto('/tarjetas/301')
  await page.getByRole('button', { name: 'Aprobar', exact: true }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Motivo').fill('Solicitud revisada')
  await dialogo.getByRole('button', { name: 'Aprobar', exact: true }).click()
  await expect(page.getByText('Generada', { exact: true }).first()).toBeVisible()
  await page.getByLabel('Código de seguimiento').fill('GUIA-301')
  await page.getByRole('button', { name: 'Registrar despacho' }).click()
  const envio = page.getByRole('region', { name: 'Envío' })
  await expect(envio).toContainText('Despachado')
  await envio.screenshot({ path: info.outputPath('despacho.png') })
  await page.getByRole('button', { name: 'Descargar sobre de PIN' }).click()
  await dialogo.getByRole('button', { name: 'Descargar sobre', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Descargar sobre de PIN' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Confirmar entrega', exact: true }).click()
  await dialogo.getByLabel('Motivo').fill('Entrega verificada')
  await expect(dialogo.getByRole('button', { name: 'Confirmar entrega', exact: true })).toBeDisabled()
  await dialogo.getByLabel('Verifiqué el documento de identidad del titular').check()
  await dialogo.screenshot({ path: info.outputPath('entrega.png') })
  await dialogo.getByRole('button', { name: 'Confirmar entrega', exact: true }).click()
  await expect(envio).toContainText('Entregado')
  await expect(page.getByText('Activa', { exact: true }).first()).toBeVisible()
})
