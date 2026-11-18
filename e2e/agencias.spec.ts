import { expect, test, type Page } from '@playwright/test'

const agencias = '/api/v1/organizacion/agencias'
const catalogo = '/api/v1/catalogos/agencias'

async function ingresar(page: Page, usuario = 'solicitante', destino = '/organizacion/agencias') {
  await page.goto(`/api/v1/auth/login?usuario=${usuario}&return_to=${encodeURIComponent(destino)}`)
}

async function solicitarBaja(page: Page, codigo: string) {
  await page.getByRole('button', { name: `Desactivar ${codigo}` }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByLabel('Motivo').fill('Cierre temporal')
  await dialogo.getByRole('button', { name: 'Solicitar desactivación' }).click()
  return dialogo
}

test('alta inactiva por teclado, duplicado, edición y reactivación', async ({ page }) => {
  await ingresar(page)
  const nueva = page.getByRole('button', { name: 'Nueva agencia' })
  await expect(nueva).toBeEnabled()
  await nueva.focus()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Código o ID')).toBeFocused()
  expect(await page.getByLabel('Código o ID').evaluate((el) => el.matches(':focus-visible') && getComputedStyle(el).boxShadow !== 'none')).toBe(true)
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Enter')
  const dialogo = page.getByRole('dialog')
  await expect(dialogo.getByLabel('Código')).toBeFocused()
  await page.keyboard.type('SUC-SUR')
  await page.keyboard.press('Tab')
  await expect(dialogo.getByRole('combobox', { name: 'Ciudad' })).toBeFocused()
  await page.keyboard.press('Enter')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(dialogo.getByRole('combobox', { name: 'Ciudad' })).toHaveText('Quito (Pichincha)')
  await expect(dialogo.getByRole('combobox', { name: 'Ciudad' })).toBeFocused()
  for (const etiqueta of ['Teléfono', 'Dirección', 'Cancelar', 'Crear agencia']) {
    await page.keyboard.press('Tab')
    const control = etiqueta === 'Cancelar' || etiqueta === 'Crear agencia'
      ? dialogo.getByRole('button', { name: etiqueta })
      : dialogo.getByLabel(etiqueta)
    await expect(control).toBeFocused()
  }
  await page.keyboard.press('Enter')
  await expect(dialogo.getByText('Ya existe una agencia con ese código.')).toBeVisible()
  await expect(dialogo.getByLabel('Código')).toBeFocused()
  await dialogo.getByLabel('Código').fill('SUC-NUEVA')
  await dialogo.getByRole('button', { name: 'Crear agencia' }).click()
  await expect(nueva).toBeFocused()
  const fila = page.getByRole('row').filter({ hasText: 'SUC-NUEVA' })
  await expect(fila).toContainText('Inactiva')
  await page.getByLabel('Estado', { exact: true }).selectOption('I')
  await expect(page.getByRole('row').filter({ hasText: 'SUC-NORTE' })).toHaveCount(0)
  await page.getByLabel('Código o ID').fill('SIN-COINCIDENCIAS')
  await expect(page.getByText('No hay agencias que coincidan con los filtros.')).toBeVisible()
  await page.getByLabel('Código o ID').clear()
  await page.getByLabel('Estado', { exact: true }).selectOption('')
  expect(await (await page.request.get(catalogo)).json()).not.toContainEqual(expect.objectContaining({ codigo: 'SUC-NUEVA' }))

  await fila.getByRole('button', { name: 'Editar SUC-NUEVA' }).click()
  await dialogo.getByLabel('Dirección').fill('Av. Amazonas')
  await dialogo.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByText('Guardamos los cambios de la agencia SUC-NUEVA.')).toBeVisible()
  await fila.getByRole('button', { name: 'Editar SUC-NUEVA' }).click()
  await expect(dialogo.getByLabel('Dirección')).toHaveValue('Av. Amazonas')
  await page.keyboard.press('Escape')
  await expect(fila.getByRole('button', { name: 'Editar SUC-NUEVA' })).toBeFocused()

  await fila.getByRole('button', { name: 'Activar SUC-NUEVA' }).click()
  await dialogo.getByLabel('Motivo').fill('Apertura')
  await dialogo.getByRole('button', { name: 'Activar', exact: true }).click()
  await expect(fila.getByText('Activa', { exact: true })).toBeVisible()
  expect(await (await page.request.get(catalogo)).json()).toContainEqual(expect.objectContaining({ codigo: 'SUC-NUEVA' }))
})

test('bloqueos y baja pendiente hasta que otra sesión aprueba en E0-08', async ({ page, browser }) => {
  await ingresar(page)
  const bloqueada = await solicitarBaja(page, 'SUC-CAJA')
  await expect(bloqueada.getByRole('alert').getByRole('listitem')).toHaveText(['jornadas de caja abiertas', 'bóvedas activas'])
  await page.keyboard.press('Escape')

  await solicitarBaja(page, 'SUC-NORTE')
  const fila = page.getByRole('row').filter({ hasText: 'SUC-NORTE' })
  await expect(fila.getByText('Activa', { exact: true })).toBeVisible()
  const enlace = page.getByRole('link', { name: 'Consultar solicitud' })
  const destino = await enlace.getAttribute('href')
  const id = destino?.split('/').at(-1)
  expect(Number(id)).toBeGreaterThan(0)
  expect(await (await page.request.get(catalogo)).json()).toContainEqual(expect.objectContaining({ idAgencia: '003' }))
  await enlace.click()
  await expect(page.getByRole('heading', { name: `Solicitud #${id}` })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0)
  const propia = await page.request.post(`/api/v1/aprobaciones/${id}/aprobar`, { data: { comentario: '' } })
  expect(propia.status()).toBe(403)
  expect(await propia.json()).toMatchObject({ codigo: 'APROBADOR_ES_SOLICITANTE' })

  const segunda = await browser.newContext()
  try {
    const aprobador = await segunda.newPage()
    await ingresar(aprobador, 'aprobador', '/aprobaciones')
    await aprobador.getByRole('link', { name: `#${id}` }).click()
    await expect(aprobador.getByText('Solicitante: Ana Solicitante')).toBeVisible()
    await aprobador.getByRole('button', { name: 'Aprobar', exact: true }).click()
    await aprobador.getByRole('dialog').getByRole('button', { name: 'Aprobar', exact: true }).click()
    await expect(aprobador.getByText('Ejecutada', { exact: true }).first()).toBeVisible()
    await expect(aprobador.getByText('Responsable de la decision: Luis Aprobador')).toBeVisible()
  } finally {
    await segunda.close()
  }

  await page.goto('/organizacion/agencias')
  await expect(fila.getByText('Inactiva', { exact: true })).toBeVisible()
  expect(await (await page.request.get(catalogo)).json()).not.toContainEqual(expect.objectContaining({ idAgencia: '003' }))
  expect(await (await page.request.get(`${agencias}/003`)).json()).toMatchObject({ idAgencia: '003', estado: 'I' })
})

test('carga, error recuperable, lista vacía y acceso denegado', async ({ page }) => {
  let peticiones = 0
  let liberar!: () => void
  const espera = new Promise<void>((resolve) => { liberar = resolve })
  await page.route(agencias, async (route) => {
    peticiones += 1
    if (peticiones === 1) {
      await espera
      return route.fulfill({ status: 500, json: { detail: 'Error de prueba' } })
    }
    return route.fulfill({ status: 200, json: [] })
  })
  await ingresar(page)
  await expect(page.getByText('Cargando agencias…')).toBeVisible()
  liberar()
  await expect(page.getByRole('alert')).toContainText('Error de prueba')
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('Todavía no hay agencias registradas.')).toBeVisible()
  await page.unroute(agencias)
  await ingresar(page, 'asesor')
  await expect(page.getByRole('alert')).toContainText('No tienes permiso para administrar agencias.')
  await expect(page.getByRole('button', { name: 'Nueva agencia' })).toHaveCount(0)
  expect((await page.request.get(agencias)).status()).toBe(403)
})
