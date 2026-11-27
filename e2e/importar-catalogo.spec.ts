import { expect, test, type Page } from '@playwright/test'

const rutaImportaciones = '/api/v1/contabilidad/cuentas/importaciones'
const pantalla = '/contabilidad/importar-catalogo'
const csv = 'CodigoCuenta,NombreCuenta,CodigoCuentaSuperior,Naturaleza\n3,Patrimonio,,ACREEDORA\n1,Activo regulatorio,,DEUDORA\n2,Pasivo,,ACREEDORA\n'
const csvConError = `${csv}4,Ingresos,,DEUDORA\n`
const fila = (numeroFila: number, CodigoCuenta: string, NombreCuenta: string, Naturaleza: string, resultado: string, codigoError: string | null = null) => ({
  numeroFila, CodigoCuenta, NombreCuenta, CodigoCuentaSuperior: '', Naturaleza, resultado, codigoError,
  anterior: resultado === 'Nueva' ? null : {
    nombre: resultado === 'Cambiada' ? 'Activo anterior' : NombreCuenta,
    naturaleza: codigoError === 'NATURALEZA_EN_USO' ? 'ACREEDORA' : Naturaleza,
    padre: null, regulador: true, imputable: false,
  },
})

type Opciones = {
  preparar?: boolean; consultar?: boolean; aplicar?: boolean; errorFila?: boolean; errorCarga?: boolean;
  errorAplicacion?: number; sinWorkOS?: boolean; yaAplicada?: boolean; demoraAplicacion?: Promise<void>; perderRespuesta?: boolean;
}

async function simular(page: Page, opciones: Opciones = {}) {
  const estado = { cargas: 0, aplicaciones: 0, consultas: 0, recuperaciones: 0, aplicada: Boolean(opciones.yaAplicada) }
  const revision = [
    fila(2, '3', 'Patrimonio', 'ACREEDORA', 'Nueva'),
    fila(3, '1', 'Activo regulatorio', 'DEUDORA', 'Cambiada'),
    fila(4, '2', 'Pasivo', 'ACREEDORA', 'Igual'),
  ]
  if (opciones.errorFila) revision.push(fila(5, '4', 'Ingresos', 'DEUDORA', 'Error', 'NATURALEZA_EN_USO'))
  const importacion = {
    IdImportacion: 42, NombreArchivo: 'regulador.csv', Filas: revision.length, FilasError: Number(Boolean(opciones.errorFila)),
    FilasNuevas: 1, FilasCambiadas: 1, FilasIguales: 1,
    CargadoPor: 19, FechaCarga: '2026-11-19T16:00:00.420000', AplicadoPor: null, FechaAplicada: null, estado: 'Revision', revision,
  }
  const aplicada = { ...importacion, estado: 'Aplicada', AplicadoPor: 19, FechaAplicada: '2026-11-19T16:01:00.810000' }

  await page.route('**/api/v1/**', async (route) => {
    const solicitud = route.request()
    const ruta = new URL(solicitud.url()).pathname
    const responder = (json: unknown, status = 200) => route.fulfill({ status, json })
    if (ruta.endsWith('/auth/me')) {
      const funciones = ['contabilidad.cuentas.consultar']
      if (opciones.consultar !== false) funciones.push('contabilidad.importaciones.consultar')
      if (opciones.preparar !== false) funciones.push('contabilidad.importaciones.preparar')
      if (opciones.aplicar !== false) funciones.push('contabilidad.importaciones.aplicar')
      const autorizacion = opciones.sinWorkOS ? undefined : { version: 'a'.repeat(64), activa: true, funciones, rutas: ['/contabilidad'] }
      return responder({ idUsuario: 'user_fixture_importacion', nombre: 'Persona QA', email: 'qa@example.invalid',
        idOrganizacion: 'org_fixture', roles: ['CONTADOR'], permisos: opciones.sinWorkOS ? [] : ['con-cuenta-editar'], idAgencia: '001', autorizacion })
    }
    if (ruta.endsWith('/auth/agencias')) {
      const matriz = { idAgencia: '001', codigo: 'MATRIZ', estado: 'A' }
      return responder({ idAgencia: '001', agenciaEsMatriz: true, idAgenciaPrincipal: '001', agenciasAsignadas: [matriz], agenciasPermitidas: [matriz], requiereSeleccionAgencia: false, alcanceGlobal: false, accesoTodasAgencias: false })
    }
    if (ruta.endsWith('/institucion')) return responder({ nombre: 'Cooperativa QA', sitioWeb: null, logoUrl: null, origen: 'ENTIDAD' })
    if (ruta.endsWith('/aprobaciones/accesos')) return responder({ puedeVer: false, puedeSolicitar: false, pendientesParaMi: 0, diasResaltar: 30 })
    if (ruta.endsWith('/cuentas-contables') && solicitud.method() === 'GET') {
      estado.consultas++
      return responder([{
        idCuentaContable: 1, codigoCuenta: '1', nombreCuenta: estado.aplicada ? 'Activo regulatorio' : 'Activo anterior',
        naturaleza: 'DEUDORA', tipoCuenta: 'ACTIVO', idCuentaSuperior: null, esImputable: false, saldo: 0, estado: 'Activo',
      }])
    }
    if (ruta === rutaImportaciones && solicitud.method() === 'POST') {
      estado.cargas++
      expect(solicitud.headers()['content-type']).toBe('text/csv')
      expect(solicitud.headers()['x-nombre-archivo']).toBe('regulador.csv')
      expect(solicitud.postData()).toBe(opciones.errorFila ? csvConError : csv)
      if (opciones.errorCarga) return responder({ code: 'ARCHIVO_INVALIDO', detail: 'Use un CSV UTF-8 con las columnas del contrato.' }, 422)
      return responder(importacion, 201)
    }
    if (ruta === `${rutaImportaciones}/42` && solicitud.method() === 'GET') {
      estado.recuperaciones++
      return responder(estado.aplicada ? aplicada : importacion)
    }
    if (ruta.startsWith(`${rutaImportaciones}/`) && solicitud.method() === 'GET') {
      return responder({ code: 'IMPORTACION_NO_ENCONTRADA', detail: 'No existe la importación.' }, 404)
    }
    if (ruta === `${rutaImportaciones}/42/aplicar` && solicitud.method() === 'POST') {
      estado.aplicaciones++
      expect(solicitud.postData()).toBeNull()
      if (opciones.errorAplicacion === 403) return responder({ code: 'SIN_PERMISO', detail: 'Acceso denegado.' }, 403)
      if (opciones.errorAplicacion === 409) return responder({ code: 'CATALOGO_CAMBIO', detail: 'Cargue el archivo de nuevo.' }, 409)
      if (opciones.errorAplicacion === 422) return responder({ code: 'IMPORTACION_CON_ERRORES', detail: 'Corrija el archivo y vuelva a cargarlo.' }, 422)
      await opciones.demoraAplicacion
      estado.aplicada = true
      if (opciones.perderRespuesta) return route.abort('timedout')
      return responder(aplicada)
    }
    return responder({ detail: 'Ruta fuera del escenario.' }, 404)
  })
  await page.goto('/contabilidad')
  await expect(page.getByRole('heading', { name: 'Plan de cuentas' })).toBeVisible()
  return estado
}

async function cargar(page: Page, contenido = csv) {
  await abrir(page)
  const cargarCsv = page.getByRole('button', { name: 'Cargar y revisar CSV' })
  await expect(cargarCsv).toBeDisabled()
  await page.getByLabel('Archivo CSV').setInputFiles({ name: 'regulador.csv', mimeType: 'application/octet-stream', buffer: Buffer.from(contenido) })
  await cargarCsv.click()
}

async function abrir(page: Page) {
  await page.getByRole('link', { name: 'Importar catálogo', exact: true }).click()
  await expect(page).toHaveURL(pantalla)
  await expect(page.getByRole('heading', { name: 'Cargar archivo' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function recuperar(page: Page, id = '42') {
  await page.getByLabel('Número de importación').fill(id)
  await page.getByRole('button', { name: 'Recuperar importación' }).click()
}

test('revisa el CSV, confirma y actualiza el árbol de cuentas', async ({ page }) => {
  const demora = Promise.withResolvers<void>()
  const estado = await simular(page, { demoraAplicacion: demora.promise })
  await expect(page.getByRole('treeitem', { name: '1 Activo anterior' })).toBeVisible()
  await cargar(page)
  await expect(page.getByRole('heading', { name: 'Revisar cambios' })).toBeVisible()
  for (const grupo of ['Cuentas nuevas (1)', 'Cuentas modificadas (1)', 'Cuentas sin cambios (1)', 'Filas con errores (0)']) {
    await expect(page.getByRole('button', { name: grupo, exact: true })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Cuentas modificadas (1)', exact: true }).click()
  await expect(page.getByText('Anterior: Activo anterior')).toBeVisible()
  await expect(page.getByText('Propuesto: Activo regulatorio')).toBeVisible()
  await page.getByRole('button', { name: 'Continuar a confirmación' }).click()
  await expect(page.getByRole('heading', { name: 'Confirmar aplicación' })).toBeFocused()
  await expect(page.getByText('Cuentas que se crearán: 1. Cuentas que se modificarán: 1.')).toBeVisible()
  expect(estado.aplicaciones).toBe(0)
  const confirmar = page.getByRole('button', { name: 'Confirmar y aplicar' })
  await confirmar.click()
  await expect(confirmar).toBeDisabled()
  await expect(page.getByText(/Aplicando la importación/)).toBeVisible()
  demora.resolve()
  await expect(page.getByText('Importación aplicada')).toBeVisible()
  await expect(page.getByText('Cuentas creadas: 1. Cuentas modificadas: 1. Cuentas sin cambios: 1.')).toBeVisible()
  await expect(page.getByText('Identificador interno del usuario: 19')).toBeVisible()
  await expect(page.getByText(/^Fecha de aplicación:/)).toBeVisible()
  expect(estado.aplicaciones).toBe(1)
  expect(estado.consultas).toBeGreaterThan(1)
  await page.getByRole('link', { name: 'Ver plan actualizado' }).click()
  await expect(page).toHaveURL('/contabilidad')
  await expect(page.getByRole('treeitem', { name: '1 Activo regulatorio' })).toBeVisible()
})

test('muestra la fila y el motivo y bloquea la aplicación', async ({ page }) => {
  const estado = await simular(page, { errorFila: true })
  await cargar(page, csvConError)
  const filaConError = page.getByRole('row').filter({ hasText: 'La naturaleza no se puede cambiar porque la cuenta tiene saldo, movimientos o cuentas hijas.' })
  await expect(filaConError.getByRole('cell', { name: '5', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar a confirmación' })).toBeDisabled()
  expect(estado.aplicaciones).toBe(0)
})

test('muestra 422 ARCHIVO_INVALIDO y permite cargar otro archivo', async ({ page }) => {
  await simular(page, { errorCarga: true })
  await cargar(page)
  await expect(page.getByRole('alert')).toContainText('No pudimos validar el CSV.')
  await expect(page.getByLabel('Archivo CSV')).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Continuar a confirmación' })).toHaveCount(0)
})

test('oculta el acceso y protege la ruta directa sin funciones de importación', async ({ page }) => {
  await simular(page, { preparar: false, consultar: false, aplicar: false })
  await expect(page.getByRole('link', { name: 'Importar catálogo' })).toHaveCount(0)
  await page.goto(pantalla)
  await expect(page.getByRole('alert')).toContainText('No tienes permiso para cargar ni consultar importaciones.')
  await expect(page.getByRole('link', { name: 'Volver al plan de cuentas' })).toBeVisible()
})

test('oculta la carga sin permiso WorkOS en el modo anterior', async ({ page }) => {
  await simular(page, { sinWorkOS: true })
  await expect(page.getByRole('link', { name: 'Importar catálogo' })).toHaveCount(0)
})

test('permite revisar con permiso de preparación y sin permiso de aplicación', async ({ page }) => {
  await simular(page, { aplicar: false })
  await cargar(page)
  await expect(page.getByText('Cuentas nuevas (1)')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continuar a confirmación' })).toHaveCount(0)
})

for (const [status, mensaje] of [
  [403, 'No tienes autorización para esta operación.'],
  [409, 'Carga el archivo y revísalo nuevamente antes de aplicar.'],
  [422, 'Corrige el CSV y vuelve a cargarlo para revisarlo.'],
] as const) {
  test(`muestra el error ${status} al confirmar y bloquea la revisión actual`, async ({ page }) => {
    await simular(page, { errorAplicacion: status })
    await cargar(page)
    await page.getByRole('button', { name: 'Continuar a confirmación' }).click()
    await page.getByRole('button', { name: 'Confirmar y aplicar' }).click()
    await expect(page.getByRole('heading', { name: 'Resultado' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText(mensaje)
    await expect(page.getByRole('button', { name: 'Volver a confirmar' })).toHaveCount(0)
    if (status === 409) {
      await page.getByRole('button', { name: 'Cargar otro archivo' }).click()
      await recuperar(page)
      await expect(page.getByRole('button', { name: 'Continuar a confirmación' })).toBeDisabled()
    }
  })
}

test('recupera una revisión por ID, con permiso de consulta y sin permiso de carga', async ({ page }) => {
  const estado = await simular(page, { preparar: false })
  await abrir(page)
  await expect(page.getByLabel('Archivo CSV')).toHaveCount(0)
  await recuperar(page, '2147483648')
  await expect(page.getByRole('alert')).toContainText('Ingresa un número de importación válido')
  await recuperar(page, '41')
  await expect(page.getByRole('alert')).toContainText('No encontramos una importación tuya')
  await recuperar(page)
  await expect(page.getByRole('heading', { name: 'Revisar cambios' })).toBeVisible()
  expect(estado.recuperaciones).toBe(1)
  expect(estado.cargas).toBe(0)
})

test('recupera el resultado de una importación ya aplicada sin repetir el POST', async ({ page }) => {
  const estado = await simular(page, { yaAplicada: true })
  await abrir(page)
  await recuperar(page)
  await expect(page.getByText('Importación aplicada')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar y aplicar' })).toHaveCount(0)
  expect(estado.aplicaciones).toBe(0)
})

test('recupera la aplicación tras perder la respuesta del POST', async ({ page }) => {
  const estado = await simular(page, { perderRespuesta: true })
  await cargar(page)
  await page.getByRole('button', { name: 'Continuar a confirmación' }).click()
  await page.getByRole('button', { name: 'Confirmar y aplicar' }).click()
  await page.getByRole('button', { name: 'Consultar estado' }).click()
  await expect(page.getByText('Importación aplicada')).toBeVisible()
  expect(estado.aplicaciones).toBe(1)
  expect(estado.recuperaciones).toBe(1)
})

test('valida localmente el archivo y vuelve al plan sin enviar solicitudes de carga', async ({ page }) => {
  const estado = await simular(page)
  await abrir(page)
  await page.getByLabel('Archivo CSV').setInputFiles({ name: 'regulador.txt', mimeType: 'text/plain', buffer: Buffer.from(csv) })
  await page.getByRole('button', { name: 'Cargar y revisar CSV' }).click()
  await expect(page.getByRole('alert')).toContainText('extensión .csv')
  await page.getByRole('link', { name: 'Volver al plan de cuentas' }).click()
  await expect(page.getByRole('heading', { name: 'Plan de cuentas' })).toBeVisible()
  expect(estado.cargas).toBe(0)
})
