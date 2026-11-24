import { expect, test } from '@playwright/test'

test('E1-04 protege la edición propia y permite asignar varios roles a otro usuario', async ({ page }) => {
  test.setTimeout(90_000)
  const email = 'admin@e104.invalid'
  const agencia = { idAgencia: '001', codigo: 'MATRIZ', nombre: 'Matriz', estado: 'A', principal: true }
  const usuario = {
    idUsuario: 29, username: 'admin.qa', nombres: 'Admin', apellidos: 'QA', email,
    rol: 'ADMIN', estado: 'Activo', idAgencia: '001', vinculado: true,
    fechaCreacion: '2026-11-09T04:26:40.093000', cedula: '1724016660', ultimoAcceso: null,
    estadoInvitacion: null, bloqueo: null,
  }
  let rolesOtro = ['CONTADOR']
  const otroUsuario = () => ({ ...usuario, idUsuario: 30, nombres: 'Andrea', email: 'andrea@e104.invalid', rol: rolesOtro[0], roles: rolesOtro })

  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    switch (path) {
      case '/auth/me':
        return route.fulfill({ json: { idUsuario: 'user_e104', nombre: 'Admin QA', email, idOrganizacion: null, idAgencia: '001', roles: ['ADMIN'], permisos: ['usuariosEditar'] } })
      case '/auth/refresh':
        return route.fulfill({ status: 204 })
      case '/auth/agencias':
        return route.fulfill({ json: { idAgencia: '001', idAgenciaPrincipal: '001', agenciasAsignadas: [agencia], agenciasPermitidas: [agencia], requiereSeleccionAgencia: false, alcanceGlobal: true } })
      case '/catalogos/agencias':
        return route.fulfill({ json: [agencia] })
      case '/usuarios/29':
        return route.fulfill({ json: usuario })
      case '/usuarios/29/agencias':
        return route.fulfill({ json: { idUsuario: 29, idAgenciaPrincipal: '001', agencias: [agencia], version: 1 } })
      case '/usuarios/29/agencias/historial':
        return route.fulfill({ json: { items: [], page: 1, pageSize: 20, total: 0 } })
      case '/usuarios/30':
        return route.fulfill({ json: otroUsuario() })
      case '/usuarios/30/agencias':
        return route.fulfill({ json: { idUsuario: 30, idAgenciaPrincipal: '001', agencias: [agencia], version: 1 } })
      case '/usuarios/30/roles':
        expect(route.request().method()).toBe('PUT')
        expect(route.request().postDataJSON()).toEqual({ roles: ['CONTADOR', 'AUDITOR'] })
        rolesOtro = ['CONTADOR', 'AUDITOR']
        return route.fulfill({ json: otroUsuario() })
      default:
        return route.fulfill({ status: 404, json: { detail: 'Ruta ajena al escenario' } })
    }
  })

  await page.goto('/usuarios/29')
  await expect(page.getByText('Tu usuario')).toBeVisible()
  const agencias = page.getByRole('region', { name: 'Asignaciones de agencias' })
  await expect(agencias.getByLabel('Agencia principal')).toBeDisabled()
  await expect(agencias.getByRole('button', { name: 'Guardar asignaciones' })).toHaveCount(0)
  await agencias.getByRole('button', { name: 'Ver historial de agencias' }).click()
  await expect(agencias.getByText('No hay cambios registrados.')).toBeVisible()

  await page.goto('/usuarios/30')
  const rolesYAgencia = page.getByRole('region', { name: 'Rol y agencia' })
  await rolesYAgencia.getByRole('button', { name: 'Cambiar', exact: true }).first().click()
  const dialogo = page.getByRole('dialog', { name: 'Cambiar roles' })
  await expect(dialogo.getByRole('checkbox', { name: /Contador/i })).toBeChecked()
  await dialogo.getByRole('checkbox', { name: /Auditor/i }).check()
  await dialogo.getByRole('button', { name: 'Guardar roles' }).click()
  await expect(rolesYAgencia.getByText(/Contador, Auditor/i)).toBeVisible()
  await page.reload()
  await expect(rolesYAgencia.getByText(/Contador, Auditor/i)).toBeVisible({ timeout: 15_000 })
})

test('E1-04 muestra el traslado de agencia y actualiza el historial', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const matriz = { idAgencia: '001', codigo: 'MATRIZ', nombre: 'Matriz', tipoAgencia: 'Matriz', provincia: 'Guayas', ciudad: 'Guayaquil', estado: 'A', principal: true }
  const sucursal = { ...matriz, idAgencia: '002', codigo: 'SUR', nombre: 'Sucursal Sur', tipoAgencia: 'Sucursal' }
  let actual = matriz

  const usuario = () => ({
    idUsuario: 31, username: 'cajero.qa', nombres: 'Cajero', apellidos: 'QA', email: 'cajero@e104.invalid',
    rol: 'CAJERO', roles: ['CAJERO'], estado: 'Activo', idAgencia: actual.idAgencia, vinculado: true,
    fechaCreacion: '2026-11-09T04:26:40.093000', cedula: '1724016660', ultimoAcceso: null,
    estadoInvitacion: null, bloqueo: null,
  })

  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    switch (path) {
      case '/auth/me':
        return route.fulfill({ json: { idUsuario: 'user_e104', nombre: 'Admin QA', email: 'admin@e104.invalid', idOrganizacion: null, idAgencia: '001', roles: ['ADMIN'], permisos: ['usuariosEditar'] } })
      case '/auth/refresh':
        return route.fulfill({ status: 204 })
      case '/auth/agencias':
        return route.fulfill({ json: { idAgencia: '001', idAgenciaPrincipal: '001', agenciasAsignadas: [matriz], agenciasPermitidas: [matriz, sucursal], requiereSeleccionAgencia: false, alcanceGlobal: true } })
      case '/catalogos/agencias':
        return route.fulfill({ json: [matriz, sucursal] })
      case '/usuarios/31':
        return route.fulfill({ json: usuario() })
      case '/usuarios/31/agencias':
        return route.fulfill({ json: { idUsuario: 31, idAgenciaPrincipal: actual.idAgencia, agencias: [actual], version: actual === matriz ? 1 : 2 } })
      case '/usuarios/31/agencias/historial': {
        const items = actual === matriz ? [] : [{ idHistorial: 2, idAgencia: '002', accion: 'PRINCIPAL', principalAnterior: '001', principalNueva: '002', realizadoPor: 29, nombreActor: 'Admin QA', agenciaActor: '001', fechaUtc: '2026-11-23T14:00:00Z' }]
        return route.fulfill({ json: { items, page: 1, pageSize: 20, total: items.length } })
      }
      case '/usuarios/31/agencia':
        expect(route.request().method()).toBe('PUT')
        expect(route.request().postDataJSON()).toEqual({ idAgencia: '002' })
        actual = sucursal
        return route.fulfill({ json: usuario() })
      default:
        return route.fulfill({ status: 404, json: { detail: 'Ruta ajena al escenario' } })
    }
  })

  await page.goto('/usuarios/31')
  const rolesYAgencia = page.getByRole('region', { name: 'Rol y agencia' })
  await rolesYAgencia.getByRole('button', { name: 'Ver historial de agencias' }).click()
  await expect(rolesYAgencia.getByText('No hay cambios registrados.')).toBeVisible()
  await rolesYAgencia.getByRole('listitem').filter({ hasText: 'Agencia principal' }).getByRole('button', { name: 'Cambiar' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Cambiar agencia' })
  await dialogo.getByLabel('Agencia', { exact: true }).selectOption('002')
  await dialogo.getByRole('button', { name: 'Guardar agencia' }).click()
  await expect(dialogo).toBeHidden()
  await expect(rolesYAgencia.getByRole('listitem').filter({ hasText: 'Agencia principal' })).toContainText('Sucursal Sur')
  const cambio = rolesYAgencia.getByRole('row').filter({ has: page.getByRole('cell', { name: 'PRINCIPAL', exact: true }) })
  await expect(cambio).toContainText('Admin QA')
  await page.screenshot({ path: testInfo.outputPath('e104-traslado.png'), fullPage: true })
})

const agenciaSeguridad = { idAgencia: '001', codigo: 'MATRIZ', nombre: 'Matriz', estado: 'A', principal: true }
const usuarioSeguridad = {
  idUsuario: 32, username: 'cajero.e104', nombres: 'Ana', apellidos: 'QA', email: 'ana@e104.invalid',
  rol: 'CAJERO', roles: ['CAJERO'], estado: 'Activo', idAgencia: '001', vinculado: true,
  fechaCreacion: '2026-11-09T04:26:40.093000', cedula: '1724016660', ultimoAcceso: null,
  estadoInvitacion: null, bloqueo: null,
}

for (const resultado of ['Rechazada', 'Ejecutada'] as const) {
  test('E1-04 confirmado por E0-08: ' + resultado, async ({ page }) => {
    let estado: string = 'Pendiente'
    let escrituras = 0
    await page.route('**/api/v1/**', (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/v1/usuarios/32/roles') {
        escrituras++
        return route.fulfill({ status: 202, json: { idSolicitud: 123, estado: 'Pendiente', requiereAprobacion: true } })
      }
      if (path === '/api/v1/aprobaciones/123') {
        return route.fulfill({ json: {
          idSolicitud: 123, codigoTransaccion: 'SEG-USUARIO-ROLES', tipoObjetivo: 'UsuarioRoles', idObjetivo: '32',
          estado, idAgencia: null, fechaSolicitud: '2026-11-24T12:00:00Z',
          solicitante: { sujeto: 'admin', nombre: 'Admin QA', idInterno: 29 },
          resolutor: null, fechaResolucion: null, comentario: null, codigoError: null,
          puedeAprobar: false, puedeRechazar: false, puedeCancelar: estado === 'Pendiente',
          antes: { roles: ['CAJERO'] }, despues: { roles: ['CAJERO', 'AUDITOR'] }, eventos: [],
        } })
      }
      if (path === '/api/v1/usuarios/32') return route.fulfill({ json: {
        ...usuarioSeguridad, roles: estado === 'Ejecutada' ? ['CAJERO', 'AUDITOR'] : ['CAJERO'],
      } })
      return responderBase(route)
    })

    await page.goto('/usuarios/32')
    const fichaRoles = page.getByRole('listitem').filter({ hasText: 'Define los m\u00f3dulos' })
    await fichaRoles.getByRole('button', { name: 'Cambiar' }).click()
    const dialogo = page.getByRole('dialog')
    await dialogo.getByRole('checkbox', { name: /Auditor/i }).check()
    await dialogo.getByRole('button', { name: 'Guardar roles' }).click()
    await expect(page.getByText('Solicitud de roles #123 \u00b7 Pendiente')).toBeVisible()
    await expect(fichaRoles.getByRole('button')).toBeDisabled()
    await expect(fichaRoles).not.toContainText('Auditor')
    await page.getByRole('link', { name: 'Consultar solicitud' }).click()
    await expect(page.getByRole('heading', { name: 'Solicitud #123' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0)
    estado = resultado
    await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click()
    await expect(page.getByText(resultado, { exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Consultar ficha del usuario' }).click()
    await page.getByRole('button', { name: 'Actualizar estado de la solicitud' }).click()
    await expect(fichaRoles.getByRole('button')).toBeEnabled()
    if (resultado === 'Ejecutada') await expect(fichaRoles).toContainText('Auditor')
    else await expect(fichaRoles).not.toContainText('Auditor')
    expect(escrituras).toBe(1)
  })
}

test('E1-04 conserva el borrador ante jerarqu\u00eda e incompatibilidad', async ({ page }) => {
  let intentos = 0
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/usuarios/32') return route.fulfill({ json: usuarioSeguridad })
    if (path === '/api/v1/usuarios/32/roles') {
      const code = ++intentos === 1 ? 'NIVEL_INSUFICIENTE' : 'ROLES_INCOMPATIBLES'
      return route.fulfill({ status: 422, json: { detail: { code, message: code } } })
    }
    return responderBase(route)
  })
  await page.goto('/usuarios/32')
  await page.getByRole('listitem').filter({ hasText: 'Define los m\u00f3dulos' }).getByRole('button', { name: 'Cambiar' }).click()
  const dialogo = page.getByRole('dialog')
  const auditor = dialogo.getByRole('checkbox', { name: /Auditor/i })
  await auditor.check()
  await dialogo.getByRole('button', { name: 'Guardar roles' }).click()
  await expect(dialogo.getByText(/nivel de autorizaci\u00f3n es insuficiente/)).toBeVisible()
  await expect(auditor).toBeChecked()
  await dialogo.getByRole('checkbox', { name: /Contador/i }).check()
  await dialogo.getByRole('button', { name: 'Guardar roles' }).click()
  await expect(dialogo.getByText(/impide combinar los roles/)).toBeVisible()
  await expect(auditor).toBeChecked()
})

test('E1-04 separa el correo vinculado y exige consultar su conciliaci\u00f3n', async ({ page }) => {
  const confirmado = { ...usuarioSeguridad }
  const patches: unknown[] = []
  await page.route('**/api/v1/**', async (route) => {
    if (new URL(route.request().url()).pathname !== '/api/v1/usuarios/32') return responderBase(route)
    if (route.request().method() === 'GET') return route.fulfill({ json: confirmado })
    const patch = route.request().postDataJSON()
    patches.push(patch)
    if (patch.email) return route.fulfill({ status: 503, json: { detail: { code: 'CORREO_EN_CONCILIACION' } } })
    Object.assign(confirmado, patch)
    return route.fulfill({ json: confirmado })
  })

  await page.goto('/usuarios/32')
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  const datos = page.getByRole('form', { name: 'Editar datos personales' })
  await datos.getByLabel('Nombres').fill('Anita')
  await datos.getByLabel('Correo electr\u00f3nico').fill('anita@e104.invalid')
  const guardar = datos.getByRole('button', { name: 'Guardar cambios' })
  await guardar.click()
  await expect(guardar).toBeDisabled()
  expect(patches).toEqual([{ nombres: 'Anita' }, { email: 'anita@e104.invalid' }])
  const consultar = page.getByRole('button', { name: 'Consultar estado del cambio' })
  await consultar.click()
  await expect(page.getByText(/no confirma el cambio/)).toBeVisible()
  await expect(guardar).toBeDisabled()
  confirmado.email = 'anita@e104.invalid'
  await consultar.click()
  await expect(consultar).toHaveCount(0)
  expect(patches).toHaveLength(2)
})

test('E0-08 consulta la misma aprobacion al recuperar un cambio de roles', async ({ page }) => {
  let estado = 'Pendiente'
  let aprobaciones = 0
  await page.route('**/api/v1/**', (route) => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/v1/aprobaciones/124/aprobar') {
      aprobaciones++
      estado = 'Aprobada'
      return route.fulfill({ status: 503, json: { detail: { code: 'APROBACION_PENDIENTE_RECUPERACION' } } })
    }
    if (path === '/api/v1/aprobaciones/124') return route.fulfill({ json: {
      idSolicitud: 124, codigoTransaccion: 'SEG-USUARIO-ROLES', tipoObjetivo: 'UsuarioRoles', idObjetivo: '32',
      estado, idAgencia: null, fechaSolicitud: '2026-11-24T12:00:00Z',
      solicitante: { sujeto: 'otro_admin', nombre: 'Otra persona', idInterno: 40 },
      resolutor: null, fechaResolucion: null, comentario: null, codigoError: null,
      puedeAprobar: estado === 'Pendiente', puedeRechazar: estado === 'Pendiente', puedeCancelar: false,
      antes: { roles: ['CAJERO'] }, despues: { roles: ['AUDITOR'] }, eventos: [],
    } })
    return responderBase(route)
  })
  await page.goto('/aprobaciones/124')
  await page.getByRole('button', { name: 'Aprobar', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Aprobar', exact: true }).click()
  await expect(page.getByText(/est\u00e1 en recuperaci\u00f3n/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0)
  estado = 'Ejecutada'
  await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click()
  await expect(page.getByText('Ejecutada', { exact: true })).toBeVisible()
  expect(aprobaciones).toBe(1)
})

function responderBase(route: import('@playwright/test').Route) {
  const path = new URL(route.request().url()).pathname
  if (path === '/api/v1/auth/me') return route.fulfill({ json: {
    idUsuario: 'user_e104', nombre: 'Admin QA', email: 'admin@e104.invalid', roles: ['ADMIN'],
    permisos: ['usuariosEditar'], idOrganizacion: null, idAgencia: '001',
  } })
  if (path === '/api/v1/auth/refresh') return route.fulfill({ status: 204 })
  if (path === '/api/v1/auth/agencias') return route.fulfill({ json: {
    idAgencia: '001', idAgenciaPrincipal: '001', agenciasAsignadas: [agenciaSeguridad],
    agenciasPermitidas: [agenciaSeguridad], requiereSeleccionAgencia: false, alcanceGlobal: true,
  } })
  if (path === '/api/v1/catalogos/agencias') return route.fulfill({ json: [agenciaSeguridad] })
  if (path === '/api/v1/usuarios/32/agencias') return route.fulfill({ json: { idUsuario: 32, idAgenciaPrincipal: '001', agencias: [agenciaSeguridad], version: 1 } })
  if (path === '/api/v1/aprobaciones/accesos') return route.fulfill({ json: { puedeVer: true, puedeSolicitar: true, pendientesParaMi: 0, diasResaltar: 3 } })
  if (path === '/api/v1/aprobaciones/notificaciones') return route.fulfill({ json: { items: [], total: 0 } })
  return route.fulfill({ status: 404 })
}
