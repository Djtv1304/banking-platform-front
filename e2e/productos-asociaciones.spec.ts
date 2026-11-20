import { expect, test, type Page } from '@playwright/test'

// Prueba exclusiva del frontend: todas las llamadas API se interceptan.
// No inicia backend ni escribe en bases de datos.
const vacios = () => ({ tasasInteres: [] as number[], comisiones: [] as { idComision: number; exonerado: boolean }[], seguros: [] as { idSeguro: number; esObligatorio: boolean }[], sistemasAmortizacion: [] as string[] })
const modelo = (id: number, estado = 'Activo') => ({ idSubProducto: id, idProducto: 9, codigoSubProducto: `CRE-A${id - 40}`, nombreSubProducto: `Credito A${id - 40}`, estado: 'A', estadoCatalogo: estado, fechaRegistro: '2026-11-19T12:00:00Z', tipoTarjeta: null, edadMinima: 18, edadMaxima: 75 })
const producto = (tipo = 'Credito') => ({ idProducto: 9, codigoProducto: 'CRE', nombreProducto: 'Credito personal', tipoProducto: tipo, idTipoCredito: tipo === 'Credito' ? 1 : null, permiteOperacionesPresenciales: true, estado: 'A', estadoCatalogo: 'Activo', subproductos: [modelo(41), modelo(42)] })

async function simular(page: Page, opciones: { lectura?: boolean; herencia?: boolean; tipo?: string; falloCatalogo?: boolean } = {}) {
  const estado = { modelos: new Map([[41, vacios()], [42, vacios()]]), comunes: vacios(), escrituras: [] as { ruta: string; datos: ReturnType<typeof vacios> }[], inesperadas: [] as string[], falloCatalogo: opciones.falloCatalogo ?? false, rechazo: false }
  if (opciones.herencia) { estado.comunes.tasasInteres = [2]; estado.comunes.comisiones = [{ idComision: 5, exonerado: false }]; estado.comunes.seguros = [{ idSeguro: 7, esObligatorio: true }] }
  const tasas = [1, 2, 3].map(id => ({ idTasaInteres: id, tipoTasa: opciones.tipo === 'Cuenta' ? 'AHORRO' : 'CREDITO', idTipoCredito: 1, nombreTipoCredito: 'Consumo', tasaNominalAnual: id / 10, recargoMoraSobreTasa: 0, montoMinimo: (id - 1) * 1000 + 1, montoMaximo: id * 1000, plazoMaximoMeses: 12, vigenciaDesde: '2026-01-01', vigente: true }))
  await page.route('**/api/v1/**', async route => {
    const request = route.request(), ruta = new URL(request.url()).pathname, metodo = request.method()
    const responder = (json: unknown, status = 200) => route.fulfill({ status, json })
    if (ruta.endsWith('/auth/me')) return responder({ idUsuario: 'user_fixture_asociaciones', nombre: 'Persona QA', email: 'qa@example.invalid', idOrganizacion: 'org_fixture', roles: [opciones.lectura ? 'SUPERVISOR' : 'ADMIN'], permisos: opciones.lectura ? ['prd-consultar'] : ['prd-consultar', 'prd-editar', 'prd-condicion', 'prd-numeracion'], idAgencia: opciones.lectura ? '001' : null })
    if (ruta.endsWith('/auth/refresh')) return route.fulfill({ status: 204, body: '' })
    if (ruta.endsWith('/auth/agencias')) return responder({ idAgencia: opciones.lectura ? '001' : null, idAgenciaPrincipal: '001', agenciasAsignadas: [{ idAgencia: '001', codigo: '001', estado: 'A' }], agenciasPermitidas: [{ idAgencia: '001', codigo: '001', estado: 'A' }], requiereSeleccionAgencia: false, alcanceGlobal: !opciones.lectura, accesoTodasAgencias: !opciones.lectura })
    if (ruta.endsWith('/institucion')) return responder({ nombre: 'Cooperativa QA', sitioWeb: null, logoUrl: null, origen: 'ENTIDAD' })
    if (ruta.endsWith('/aprobaciones/accesos')) return responder({ puedeVer: true, puedeSolicitar: !opciones.lectura, pendientesParaMi: 0, diasResaltar: 30 })
    if (ruta.endsWith('/aprobaciones/notificaciones')) return responder({ items: [], total: 0 })
    if (ruta.endsWith('/catalogos/agencias')) return responder([{ idAgencia: '001', codigo: '001', nombre: 'Agencia Matriz', tipoAgencia: 'Matriz', provincia: 'Pichincha', ciudad: 'Quito', estado: 'A' }])
    if (ruta.endsWith('/catalogos/tasas-interes')) return estado.falloCatalogo ? responder({ title: 'Catalogo no disponible', status: 503, detail: 'No se pudo consultar el catalogo de tasas.' }, 503) : responder(tasas)
    if (ruta.endsWith('/catalogos/comisiones')) return responder([{ idComision: 5, codigoComision: 'COM-5', tipoComision: 'Servicio', tipoCalculo: 'Fijo', valor: 2, nombreCanal: 'Ventanilla', descripcion: 'Comision de servicio' }])
    if (ruta.endsWith('/catalogos/seguros')) return responder([{ idSeguro: 7, codigoSeguro: 'SEG-7', nombre: 'Seguro de proteccion', aseguradora: 'Aseguradora QA', tipoCalculo: 'Fijo', valor: 3 }])
    if (ruta.endsWith('/catalogos/sistemas-amortizacion')) return responder([{ codigo: 'FRANCES', nombre: 'Frances', descripcion: 'Cuota fija' }])
    const coincidencia = ruta.match(/\/subproductos\/(41|42)\/(ficha|vinculos|vigencias|cupos)$/)
    if (coincidencia) {
      const id = Number(coincidencia[1]), seccion = coincidencia[2]
      if (seccion === 'ficha') return responder({ producto: producto(opciones.tipo), subproducto: modelo(id), elegibilidad: { edadMinima: 18, edadMaxima: 75 }, tasas: [], comisiones: [], seguros: [], sistemasAmortizacion: [], cupos: [] })
      if (seccion === 'vinculos' && metodo === 'GET') return responder({ ...estado.modelos.get(id), delProducto: estado.comunes })
      if (seccion === 'vinculos' && metodo === 'PUT') {
        if (opciones.lectura) return responder({ status: 403, code: 'SIN_PERMISO', detail: 'Solo consulta.' }, 403)
        if (estado.rechazo) return responder({ status: 422, code: 'TASAS_SOLAPADAS', detail: 'Las tasas seleccionadas se superponen.' }, 422)
        const datos = request.postDataJSON() as ReturnType<typeof vacios>
        estado.escrituras.push({ ruta, datos }); estado.modelos.set(id, structuredClone(datos))
        return responder({ ...datos, delProducto: estado.comunes })
      }
      if (seccion === 'vigencias') return responder({ fechaConsulta: '2026-11-19', condiciones: [], cupos: [], restricciones: [], solicitudes: [], tiposRestriccion: [] })
      if (seccion === 'cupos') return responder([])
    }
    if (metodo !== 'GET') estado.inesperadas.push(`${metodo} ${ruta}`)
    return responder({ status: 404, detail: 'Ruta fuera del escenario frontend.' }, 404)
  })
  return estado
}

test('reutiliza tasas 1 y 3 en modelos distintos, junto a comisiones, seguros y amortizacion', async ({ page }, info) => {
  const estado = await simular(page)
  await page.goto('/productos/subproductos/41/condiciones?tab=configuracion')
  await expect(page.getByRole('tab', { name: 'Tasas y cargos' })).toHaveAttribute('aria-selected', 'true')
  await page.locator('#vin-tasa-1').check()
  await page.locator('#vin-com-5').check()
  await page.locator('#vin-seg-7').check()
  await page.locator('#vin-obl-7').check()
  await page.locator('#vin-sis-FRANCES').check()
  await page.getByRole('button', { name: /Guardar v/ }).click()
  await expect.poll(() => estado.escrituras.length).toBe(1)
  expect(estado.escrituras[0].datos).toEqual({ tasasInteres: [1], comisiones: [{ idComision: 5, exonerado: false }], seguros: [{ idSeguro: 7, esObligatorio: true }], sistemasAmortizacion: ['FRANCES'] })
  await page.goto('/productos/subproductos/42/condiciones?tab=configuracion')
  await page.locator('#vin-tasa-3').check()
  await page.getByRole('button', { name: /Guardar v/ }).click()
  await expect.poll(() => estado.escrituras.length).toBe(2)
  expect(estado.escrituras[1].datos.tasasInteres).toEqual([3])
  await page.goto('/productos/subproductos/41/condiciones?tab=configuracion')
  await expect(page.locator('#vin-tasa-1')).toBeChecked()
  await expect(page.locator('#vin-tasa-3')).not.toBeChecked()
  await expect(page.getByLabel(/Edad m.*nima/)).toBeDisabled()
  expect(estado.inesperadas).toEqual([])
  await page.screenshot({ path: info.outputPath('asociaciones-escritorio.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  const contraer = page.getByRole('button', { name: /Contraer men/ }); if (await contraer.count()) await contraer.click()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({ path: info.outputPath('asociaciones-movil.png'), fullPage: true })
})

test('respeta herencia, exoneracion propia y no elimina asociaciones comunes', async ({ page }) => {
  const estado = await simular(page, { herencia: true })
  await page.goto('/productos/subproductos/41/condiciones?tab=configuracion')
  await expect(page.locator('#vin-tasa-2')).toBeChecked()
  await expect(page.locator('#vin-tasa-2')).toBeDisabled()
  await expect(page.locator('#vin-com-5')).toBeDisabled()
  await page.locator('#vin-exo-5').check()
  await page.locator('#vin-tasa-1').check()
  await page.getByRole('button', { name: /Guardar v/ }).click()
  await expect.poll(() => estado.escrituras.length).toBe(1)
  expect(estado.escrituras[0].datos).toEqual({ tasasInteres: [1], comisiones: [{ idComision: 5, exonerado: true }], seguros: [], sistemasAmortizacion: [] })
  expect(estado.comunes.tasasInteres).toEqual([2])
  expect(estado.comunes.comisiones).toEqual([{ idComision: 5, exonerado: false }])
})

test('sin permiso solo consulta; conserva las pestanas de vigencias y numeracion', async ({ page }) => {
  const estado = await simular(page, { lectura: true, tipo: 'Cuenta', herencia: true })
  await page.goto('/productos/subproductos/41/condiciones?tab=configuracion')
  await expect(page.getByText('Solo tiene permisos de lectura.', { exact: true })).toBeVisible()
  await expect(page.locator('#vin-tasa-1')).toBeDisabled()
  await expect(page.getByRole('button', { name: /Guardar v/ })).toHaveCount(0)
  for (const nombre of ['Condiciones', 'Cupos por canal', 'Restricciones', 'Numeracion']) await expect(page.getByRole('tab', { name: nombre, exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Restricciones', exact: true }).click()
  await expect(page.getByRole('tabpanel', { name: 'Restricciones', exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Tasas y cargos', exact: true }).click()
  await expect(page.locator('#vin-tasa-2')).toBeChecked()
  expect(estado.escrituras).toHaveLength(0)
  expect(estado.inesperadas).toEqual([])
})

test('un catalogo fallido impide vaciar vinculos y el error de guardado queda visible', async ({ page }) => {
  const estado = await simular(page, { falloCatalogo: true })
  await page.goto('/productos/subproductos/41/condiciones?tab=configuracion')
  await expect(page.getByRole('button', { name: 'Reintentar catalogos', exact: true })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: /Guardar v/ })).toHaveCount(0)
  expect(estado.escrituras).toHaveLength(0)
  estado.falloCatalogo = false
  await page.getByRole('button', { name: 'Reintentar catalogos', exact: true }).click()
  await page.locator('#vin-tasa-1').check()
  estado.rechazo = true
  await page.getByRole('button', { name: /Guardar v/ }).click()
  await expect(page.getByText(/Dos tasas de cr.dito vinculadas se cruzan en monto y fechas/)).toBeVisible()
  expect(estado.escrituras).toHaveLength(0)
})
