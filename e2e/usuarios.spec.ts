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
