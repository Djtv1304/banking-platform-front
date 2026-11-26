import { expect, test } from '@playwright/test'

test('E6-10 exige agencia y resuelve las solicitudes de débito desde Aprobaciones', async ({ page }, info) => {
  const fecha = '2026-11-25T20:00:00Z'
  let agencia: string | null = null
  const agencias = [{ idAgencia: '001', codigo: 'MATRIZ', estado: 'A', principal: true }, { idAgencia: '002', codigo: 'NORTE', estado: 'A', principal: false }]
  const contextoAgencias = () => ({ idAgencia: agencia, idAgenciaPrincipal: '001', agenciasAsignadas: agencias, agenciasPermitidas: agencias, requiereSeleccionAgencia: !agencia, alcanceGlobal: false, accesoTodasAgencias: false })
  const tarjeta = {
    idTarjeta: 321,
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
    idSolicitudAprobacion: 51,
    envio: {
      idTarjeta: 321, estadoEnvio: 'Pendiente', codigoSeguimiento: null as string | null,
      despachadoEn: null as string | null,
    },
  }
  const otraTarjeta = { ...tarjeta, idTarjeta: 322, idSolicitudAprobacion: 52, envio: null }
  const solicitudes = [tarjeta, otraTarjeta].map((t) => ({
    idSolicitud: t.idSolicitudAprobacion, codigoTransaccion: 'TAR-SOLICITAR', tipoObjetivo: 'Tarjeta',
    idObjetivo: String(t.idTarjeta), idAgencia: '001', estado: 'Pendiente', fechaSolicitud: fecha,
    solicitante: { sujeto: 'user_asesor', nombre: 'Asesor QA', idInterno: 11 },
    resolutor: null, fechaResolucion: null, comentario: null, codigoError: null,
    puedeAprobar: true, puedeRechazar: true, puedeCancelar: false,
    antes: { estado: 'Solicitada' }, despues: { estado: 'Generada' }, eventos: [],
  }))

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const ruta = url.pathname
    const json = (datos: unknown) => route.fulfill({ json: datos })
    if (ruta.endsWith('/auth/me')) return json({
      idUsuario: 'user_e610',
      nombre: 'Operador de prueba',
      email: 'e610@example.invalid',
      idOrganizacion: 'org_e610',
      roles: ['SUPERVISOR', 'ASESOR'],
      permisos: ['tar-consultar', 'tar-estado', 'tar-solicitar:aprobar', 'tar-pin', 'tar-pin:entregar'],
      idAgencia: agencia,
    })
    if (ruta.endsWith('/auth/agencias')) return json(contextoAgencias())
    if (ruta.endsWith('/auth/agencia-activa')) {
      agencia = request.postDataJSON().idAgencia
      return json(contextoAgencias())
    }
    if (ruta.endsWith('/auth/refresh')) return route.fulfill({ status: 204 })
    if (ruta.endsWith('/institucion')) return json({ nombre: 'Cooperativa QA', sitioWeb: null, logoUrl: null, origen: 'ENTIDAD' })
    const pendientes = solicitudes.filter((s) => s.estado === 'Pendiente' && s.idAgencia === agencia)
    if (ruta.endsWith('/aprobaciones/accesos')) return json({ puedeVer: true, puedeSolicitar: false, pendientesParaMi: pendientes.length, diasResaltar: 30 })
    if (ruta.endsWith('/aprobaciones')) {
      const items = url.searchParams.get('bandeja') === 'resueltas' ? solicitudes.filter((s) => s.estado !== 'Pendiente') : pendientes
      return json({ items, total: items.length, page: 1, pageSize: 20, pendientesParaMi: pendientes.length, diasResaltar: 30 })
    }
    const aprobacion = ruta.match(/\/aprobaciones\/(\d+)(?:\/(aprobar|rechazar))?$/)
    if (aprobacion) {
      const fila = solicitudes.find((s) => s.idSolicitud === Number(aprobacion[1]))!
      if (aprobacion[2] === 'aprobar') {
        fila.estado = 'Ejecutada'
        tarjeta.estadoActual = 'Generada'
        tarjeta.fechaResolucion = fecha
        tarjeta.pinAsignado = true
      } else if (aprobacion[2] === 'rechazar') {
        expect(request.postDataJSON()).toEqual({ comentario: 'Rechazo ficticio' })
        fila.estado = 'Rechazada'
        otraTarjeta.estadoActual = 'Anulada'
      }
      if (aprobacion[2]) {
        fila.puedeAprobar = fila.puedeRechazar = false
        return json({ idSolicitud: fila.idSolicitud, estado: fila.estado })
      }
      return json(fila)
    }
    if (ruta.endsWith('/tarjetas/321')) return json(tarjeta)
    if (ruta.endsWith('/tarjetas/322')) return json(otraTarjeta)
    if (ruta.endsWith('/historial') || ruta.endsWith('/notificaciones')) return json({ items: [], total: 0 })
    if (ruta.endsWith('/tarjetas/321/estado')) {
      const datos = request.postDataJSON()
      expect(datos).toMatchObject({ estado: 'Activa', documentoVerificado: true })
      expect(tarjeta.envio.estadoEnvio).toBe('Despachado')
      expect(tarjeta.sobreDescargadoEn).toBe(fecha)
      tarjeta.estadoActual = 'Activa'
      tarjeta.envio.estadoEnvio = 'Entregado'
      return json(tarjeta)
    }
    if (ruta.endsWith('/tarjetas/321/envio')) {
      expect(request.postDataJSON()).toEqual({ codigoSeguimiento: 'GUIA-321' })
      tarjeta.envio = { ...tarjeta.envio, estadoEnvio: 'Despachado', codigoSeguimiento: 'GUIA-321', despachadoEn: fecha }
      return json(tarjeta.envio)
    }
    if (ruta.endsWith('/sobre-pin')) {
      tarjeta.sobreDescargadoEn = fecha
      return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.7' })
    }
    return route.fulfill({ status: 404, json: { code: 'FUERA_DEL_ESCENARIO' } })
  })

  await page.goto('/')
  const solicitud = page.getByRole('navigation', { name: 'Secciones' }).getByRole('link', { name: 'Solicitar tarjeta' })
  await expect(solicitud.locator('svg')).toBeVisible()
  await solicitud.click()
  await expect(page.getByRole('heading', { name: 'Solicitar tarjeta' })).toBeVisible()
  await expect(page.getByText('Selecciona una agencia operativa en la barra superior y pulsa Cambiar para continuar.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cliente' })).toHaveCount(0)
  await page.getByLabel('Seleccionar agencia operativa').selectOption('001')
  await page.getByRole('button', { name: 'Cambiar', exact: true }).click()
  await expect(page).toHaveURL('/')
  await solicitud.click()
  await expect(page.getByRole('heading', { name: 'Cliente' })).toBeVisible()
  await solicitud.locator('..').screenshot({ path: info.outputPath('menu-tarjetas.png') })

  await page.goto('/aprobaciones')
  await expect(page.getByRole('row').filter({ hasText: 'Tarjeta: 321' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Tarjeta: 322' })).toBeVisible()
  await page.screenshot({ path: info.outputPath('bandeja-tarjetas.png') })

  await page.goto('/tarjetas/321')
  await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0)
  await page.getByRole('link', { name: 'Ver solicitud #51 en Aprobaciones' }).click()
  await expect(page.getByRole('heading', { name: 'Solicitud #51' })).toBeVisible()
  await page.getByRole('button', { name: 'Aprobar', exact: true }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByRole('button', { name: 'Aprobar', exact: true }).click()
  await expect(page.getByText('Ejecutada', { exact: true }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Volver a aprobaciones' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Tarjeta: 322' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: 'Tarjeta: 321' })).toHaveCount(0)
  await page.getByRole('link', { name: '#52' }).click()
  await page.getByRole('button', { name: 'Rechazar', exact: true }).click()
  await dialogo.getByLabel('Comentario obligatorio').fill('Rechazo ficticio')
  await dialogo.getByRole('button', { name: 'Rechazar', exact: true }).click()
  await expect(page.getByText('Rechazada', { exact: true }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Consultar tarjeta 322' }).click()
  await expect(page.getByText('Anulada', { exact: true }).first()).toBeVisible()

  await page.goto('/tarjetas/321')
  await expect(page.getByText('Generada', { exact: true }).first()).toBeVisible()
  await page.getByLabel('Código de seguimiento').fill('GUIA-321')
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
