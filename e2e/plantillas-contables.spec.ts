import { expect, test, type Page } from '@playwright/test'

const ruta = '/contabilidad/plantillas'
const base = '/api/v1/contabilidad/plantillas'
const resumen = {
  IdPlantillaAsiento: 2, CodigoPlantilla: 'DEP', Nombre: 'Depósito de caja', Version: 2, Estado: true,
  Origen: 'CAJA', VigenciaDesde: '2026-11-01', VigenciaHasta: null, CreadoPor: 5, AprobadoPor: 9, FechaAprobacion: '2026-10-31T15:00:00',
  IdTipoAsiento: 3, CodigoTipoAsiento: 'DEP', NombreTipoAsiento: 'Depósito', IdConceptoContable: 7, CodigoConcepto: 'CAP', ConceptoDetalle: 'Capital de aportes',
}
const anterior = { ...resumen, IdPlantillaAsiento: 1, Version: 1, VigenciaDesde: '2026-01-01', VigenciaHasta: '2026-10-31' }
const nueva = { ...resumen, IdPlantillaAsiento: 3, Version: 3, Nombre: 'Depósito actualizado', Estado: false, VigenciaDesde: '2026-11-22', AprobadoPor: null, FechaAprobacion: null }
const lineas = [
  { Orden: 1, IdCuentaContable: 42, CodigoCuenta: '11010101', NombreCuenta: 'Caja auxiliar', TipoMovimiento: 'DEBITO', OrigenCuenta: 'FIJA', CodigoRol: null, ComponenteImporte: 'PRINCIPAL' },
  { Orden: 2, IdCuentaContable: null, CodigoCuenta: null, NombreCuenta: null, TipoMovimiento: 'CREDITO', OrigenCuenta: 'PRODUCTO', CodigoRol: 'CAPITAL', ComponenteImporte: 'PRINCIPAL' },
]
const cuenta = { idCuentaContable: 42, codigoCuenta: '11010101', nombreCuenta: 'Caja auxiliar', estado: 'Activo', esImputable: true, idCuentaSuperior: 11, saldo: 0, naturaleza: 'DEUDORA' }

async function simular(page: Page, opciones: { editar?: boolean; aprobador?: boolean; validar?: boolean; falloListado?: boolean } = {}) {
  const estado = { filtros: [] as Record<string, string>[], creaciones: 0, simulaciones: 0, motivos: [] as string[] }
  await page.route('**/api/v1/**', async route => {
    const req = route.request()
    const { pathname, searchParams } = new URL(req.url())
    const responder = (json: unknown, status = 200) => route.fulfill({ json, status })
    const permisos = opciones.editar === false ? [] : ['con-plantilla-editar']
    const funciones = ['contabilidad.plantillas.consultar', ...(opciones.editar === false ? [] : ['contabilidad.plantillas.editar'])]
    if (pathname.endsWith('/auth/me')) return responder({ idUsuario: 'user_plantillas', nombre: 'Contadora QA',
      email: 'qa@example.invalid', idOrganizacion: 'org_qa', roles: ['CONTADOR'], permisos, idAgencia: null,
      autorizacion: { version: 'a'.repeat(64), activa: true, funciones, rutas: [ruta] } })
    if (pathname.endsWith('/auth/agencias')) return responder({ idAgencia: null, idAgenciaPrincipal: null, agenciasAsignadas: [],
      agenciasPermitidas: [], requiereSeleccionAgencia: false, alcanceGlobal: true, accesoTodasAgencias: true })
    if (pathname.endsWith('/institucion')) return responder({ nombre: 'Cooperativa QA', sitioWeb: null, logoUrl: null, origen: 'ENTIDAD' })
    if (pathname.endsWith('/aprobaciones/accesos')) return responder({ puedeVer: true, puedeSolicitar: true, pendientesParaMi: 0, diasResaltar: 30 })
    if (pathname.endsWith('/aprobaciones/19')) return responder({
      idSolicitud: 19, codigoTransaccion: 'CON-PLANTILLA', tipoObjetivo: 'PlantillaAsiento', idObjetivo: '2', idAgencia: null,
      estado: estado.motivos.length ? 'Rechazada' : 'Pendiente', fechaSolicitud: '2026-11-20T16:00:00',
      solicitante: { sujeto: 'user_solicitante', nombre: 'Solicitante QA', idInterno: 5 },
      resolutor: null, fechaResolucion: null, comentario: null, codigoError: null,
      puedeAprobar: Boolean(opciones.aprobador) && !estado.motivos.length,
      puedeRechazar: Boolean(opciones.aprobador) && !estado.motivos.length, puedeCancelar: false,
      antes: { estado: 'Pendiente' }, despues: { estado: 'Programada' }, eventos: [],
    })
    if (pathname.endsWith('/aprobaciones/19/rechazar') && req.method() === 'POST') {
      estado.motivos.push(req.postDataJSON().comentario)
      return responder({ idSolicitud: 19, estado: 'Rechazada' })
    }
    if (pathname.endsWith('/fechas-contables/actual')) return responder({ idFechaContable: 1, fecha: '2026-11-20', esDiaContable: true, esFeriado: false, esFinDeSemana: false, horaCorte: '18:00:00' })
    if (pathname === base) {
      estado.filtros.push(Object.fromEntries(searchParams))
      if (opciones.falloListado && estado.filtros.length === 1) return route.abort('internetdisconnected')
      return responder(searchParams.get('q') ? [resumen] : [resumen, anterior])
    }
    if (pathname === `${base}/catalogos`) return responder({
      tiposAsiento: [{ IdTipoAsiento: 3, Codigo: 'DEP', Nombre: 'Depósito', Descripcion: null, EsManual: false, Estado: true }],
      conceptosContables: [{ IdConceptoContable: 7, CodigoConcepto: 'CAP', ConceptoDetalle: resumen.ConceptoDetalle, Estado: true }],
    })
    if (pathname === `${base}/3`) return responder({ ...nueva, lineas })
    if (pathname === `${base}/2`) return responder({ ...resumen, lineas })
    if (pathname === `${base}/1`) return responder({ ...anterior, lineas })
    if (pathname === `${base}/1/solicitudes`) return responder(null)
    if (pathname === `${base}/2/solicitudes`) return responder(opciones.editar === false ? null
      : { idSolicitud: 19, estado: 'Pendiente', puedeAprobar: Boolean(opciones.aprobador), puedeRechazar: Boolean(opciones.aprobador), puedeCancelar: false })
    if (pathname === `${base}/3/solicitudes`) return responder({ idSolicitud: 20, estado: 'Pendiente', puedeAprobar: false, puedeRechazar: false, puedeCancelar: true })
    if (pathname.endsWith('/cuentas-contables')) {
      expect(searchParams.get('imputable')).toBe('true')
      return responder([cuenta, { ...cuenta, idCuentaContable: 43, codigoCuenta: '11010102', nombreCuenta: 'Cuenta cerrada', estado: 'Inactivo' },
        { ...cuenta, idCuentaContable: 44, codigoCuenta: '110101', nombreCuenta: 'Cuenta de seis dígitos' }])
    }
    if (pathname === `${base}/simulaciones`) {
      estado.simulaciones++
      expect(req.postDataJSON().producto).toEqual({ CAPITAL: 42 })
      return responder({ total: '10.50', lineas: [{ cuenta: 42, lado: 'DEBITO', monto: '10.50' }, { cuenta: 42, lado: 'CREDITO', monto: '10.50' }] })
    }
    if (pathname.endsWith('/tipos-asiento/3/plantillas') && req.method() === 'POST') {
      estado.creaciones++
      expect(req.postDataJSON()).toEqual({ nombre: 'Depósito actualizado', vigenciaDesde: '2026-11-22', codigoPlantilla: 'DEP', lineas: [
        { lado: 'DEBITO', origen: 'FIJA', base: 'PRINCIPAL', cuenta: 42, rol: null },
        { lado: 'CREDITO', origen: 'PRODUCTO', base: 'PRINCIPAL', cuenta: null, rol: 'CAPITAL' },
      ] })
      if (opciones.validar) return responder({ code: 'DATOS_INVALIDOS', detail: 'Datos de entrada inválidos.',
        errors: [{ field: 'lineas.0.cuenta', message: 'Field required' }] }, 400)
      return responder({ idPlantillaAsiento: 3, idSolicitud: 20 }, 202)
    }
    return responder({ detail: 'Ruta fuera del escenario.' }, 404)
  })
  await page.goto(ruta)
  await expect(page.getByRole('heading', { name: 'Plantillas contables' })).toBeVisible()
  return estado
}

async function verDetalle(page: Page) {
  await page.getByRole('button', { name: 'Ver Depósito de caja, versión 2' }).click()
  await expect(page.getByRole('heading', { name: 'Depósito de caja' })).toBeVisible()
}

async function prepararVersion(page: Page) {
  await page.getByRole('button', { name: 'Preparar nueva versión' }).click()
  await page.getByLabel('Nombre de la versión').fill('Depósito actualizado')
  await page.getByRole('button', { name: 'Revisar propuesta' }).click()
  await expect(page.getByText('Selecciona el inicio de vigencia.')).toBeVisible()
  await page.getByLabel('Inicio de vigencia').fill('2026-11-22')
}

test('envía todos los filtros y consulta historial por familia desde una pantalla de solo lectura', async ({ page }) => {
  const estado = await simular(page, { editar: false })
  await page.getByLabel('Buscar por nombre o código').fill('Dep')
  await page.getByLabel('Código exacto').fill('DEP')
  await page.getByLabel('Estado', { exact: true }).selectOption('1')
  await page.getByLabel('Origen', { exact: true }).selectOption('CAJA')
  await page.getByLabel('Tipo de asiento').selectOption({ label: 'Depósito' })
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect.poll(() => estado.filtros.at(-1)).toEqual({ q: 'Dep', codigo: 'DEP', estado: '1', origen: 'CAJA', idTipoAsiento: '3' })
  await verDetalle(page)
  await expect(page.getByText('11010101 · Caja auxiliar')).toBeVisible()
  await expect(page.getByText('Cuenta dinámica de producto · Rol CAPITAL')).toBeVisible()
  await expect(page.getByText('No hay una solicitud visible para esta versión.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preparar nueva versión' })).toHaveCount(0)
  await expect.poll(() => estado.filtros.at(-1)).toEqual({ codigo: 'DEP', idTipoAsiento: '3' })
  await page.getByRole('button', { name: 'Ver versión 1' }).click()
  await expect(page.getByText('DEP · Versión 1')).toBeVisible()
})

test('simula con selectores, confirma la edición y muestra la solicitud pendiente', async ({ page }) => {
  const estado = await simular(page)
  await verDetalle(page)
  await expect(page.getByRole('link', { name: 'Ver historial de la solicitud' })).toHaveAttribute('href', '/aprobaciones/19')
  await prepararVersion(page)
  await expect(page.getByRole('option', { name: /Cuenta cerrada|Cuenta de seis dígitos/ })).toHaveCount(0)
  await page.getByText('Simular movimientos').click()
  await page.getByLabel('Importe de principal').fill('10,50')
  await page.getByLabel('Cuenta del producto · CAPITAL').selectOption('42')
  await page.getByRole('button', { name: 'Simular', exact: true }).click()
  await expect(page.getByText('Total de débitos: 10.5')).toBeVisible()
  await page.getByRole('button', { name: 'Revisar propuesta' }).click()
  await expect(page.getByRole('heading', { name: 'Confirmar envío a aprobación' })).toBeVisible()
  expect(estado.creaciones).toBe(0)
  await page.getByRole('button', { name: 'Confirmar y enviar' }).click()
  await expect(page.getByRole('heading', { name: 'Depósito actualizado' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Gestionar solicitud en Aprobaciones' })).toHaveAttribute('href', '/aprobaciones/20')
  await expect(page.getByText('Pendiente', { exact: true })).toBeVisible()
  expect(estado.simulaciones).toBe(1)
  expect(estado.creaciones).toBe(1)
})

test('traduce errores de Pydantic por campo sin descartar la propuesta', async ({ page }) => {
  await simular(page, { validar: true })
  await verDetalle(page)
  await prepararVersion(page)
  await page.getByRole('button', { name: 'Revisar propuesta' }).click()
  await page.getByRole('button', { name: 'Confirmar y enviar' }).click()
  await expect(page.getByText('Línea 1 · Cuenta contable. Este campo es obligatorio.')).toBeVisible()
  await expect(page.getByLabel('Nombre de la versión')).toHaveValue('Depósito actualizado')
})

test('ofrece gestionar en E0-08 cuando la solicitud habilita acciones', async ({ page }) => {
  const estado = await simular(page, { aprobador: true })
  await verDetalle(page)
  await page.getByRole('link', { name: 'Gestionar solicitud en Aprobaciones' }).click()
  await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancelar solicitud', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Rechazar', exact: true }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByRole('button', { name: 'Rechazar', exact: true }).click()
  await expect(dialogo.getByText('Escribe el motivo del rechazo.')).toBeVisible()
  await dialogo.getByLabel('Comentario obligatorio').fill('Revisar distribución contable.')
  await dialogo.getByRole('button', { name: 'Rechazar', exact: true }).click()
  await expect(page.getByText('Rechazada', { exact: true })).toBeVisible()
  expect(estado.motivos).toEqual(['Revisar distribución contable.'])
})

test('reintenta el listado tras un error de conexión y permite consultar en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await simular(page, { falloListado: true })
  await expect(page.getByRole('alert')).toContainText('No pudimos conectarnos con el servidor.')
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await verDetalle(page)
  await expect(page.getByRole('heading', { name: 'Depósito de caja' })).toBeFocused()
  await expect(page.getByRole('region', { name: 'Líneas contables de la versión' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
