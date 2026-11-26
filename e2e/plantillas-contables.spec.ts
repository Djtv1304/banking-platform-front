import { expect, test, type Page } from '@playwright/test'

const ruta = '/contabilidad/plantillas'
const base = '/api/v1/contabilidad/plantillas'
const reglas = '/api/v1/contabilidad/reglas-contables'
const resumen = {
  IdPlantillaAsiento: 2, CodigoPlantilla: 'DEP', Nombre: 'Depósito de caja', Version: 2, Estado: true,
  Origen: 'CAJA', VigenciaDesde: '2026-11-01', VigenciaHasta: null, CreadoPor: 5, AprobadoPor: 9, FechaAprobacion: '2026-10-31T15:00:00',
  IdTipoAsiento: 3, CodigoTipoAsiento: 'DEP', NombreTipoAsiento: 'Depósito', IdConceptoContable: 7, CodigoConcepto: 'CAP', ConceptoDetalle: 'Capital de aportes',
}
const anterior = { ...resumen, IdPlantillaAsiento: 1, Version: 1, VigenciaDesde: '2026-01-01', VigenciaHasta: '2026-10-31' }
const inventario = [resumen, anterior].map(p => ({
  fuente: 'PLANTILLA_ASIENTO', versionada: true, idRegla: `version-${p.IdPlantillaAsiento}`,
  IdAgencia: null, IdPlantillaAsiento: p.IdPlantillaAsiento, CodigoPlantilla: p.CodigoPlantilla, Version: p.Version, Nombre: p.Nombre,
  VigenciaDesde: p.VigenciaDesde, VigenciaHasta: p.VigenciaHasta, Estado: p.Estado, Origen: p.Origen,
  CodigoTipoAsiento: p.CodigoTipoAsiento, CodigoConcepto: p.CodigoConcepto, configurada: true,
  desde: 'CAJA', hacia: 'CUENTA', consumidor: 'DEPOSITO',
  integracion: p.Version === 2 ? 'CONECTADA' : 'SIN_VERIFICAR', Usada: p.Version === 1,
}))
const boveda = {
  idRegla: 'boveda-001-i', fuente: 'PLANTILLA_BOVEDA', versionada: false, configurada: true,
  Origen: 'BOVEDA', CodigoTipoAsiento: 'T10', desde: 'CAJA', hacia: 'BOVEDA', consumidor: null, integracion: 'PENDIENTE',
  IdAgencia: '001', TipoMovimiento: 'Traslado', Naturaleza: 'I', EstadoTipo: 'I', EsManual: null,
  Debe: '11010101', Haber: null, Habilitada: false, Version: null, vigente: null,
}
const nueva = { ...resumen, IdPlantillaAsiento: 3, Version: 3, Nombre: 'Depósito actualizado', Estado: false, VigenciaDesde: '2026-11-22', AprobadoPor: null, FechaAprobacion: null }
const lineas = [
  { Orden: 1, IdCuentaContable: 42, CodigoCuenta: '11010101', NombreCuenta: 'Caja auxiliar', TipoMovimiento: 'DEBITO', OrigenCuenta: 'FIJA', CodigoRol: null, ComponenteImporte: 'PRINCIPAL' },
  { Orden: 2, IdCuentaContable: null, CodigoCuenta: null, NombreCuenta: null, TipoMovimiento: 'CREDITO', OrigenCuenta: 'PRODUCTO', CodigoRol: 'CAPITAL', ComponenteImporte: 'PRINCIPAL' },
]
const cuenta = { idCuentaContable: 42, codigoCuenta: '11010101', nombreCuenta: 'Caja auxiliar', estado: 'Activo', esImputable: true, idCuentaSuperior: 11, saldo: 0, naturaleza: 'DEUDORA' }

async function simular(page: Page, opciones: { editar?: boolean; aprobador?: boolean; validar?: boolean; falloListado?: boolean; catalogoNoDesplegado?: boolean; primas?: boolean } = {}) {
  const movimientos = opciones.primas
    ? ['PRIMA_FIJA', 'PRIMA_VARIABLE'].flatMap(base => lineas.map(linea => ({ ...linea, ComponenteImporte: base })))
      .map((linea, i) => ({ ...linea, Orden: i + 1 }))
    : lineas
  const entrada = movimientos.map(linea => ({
    lado: linea.TipoMovimiento, origen: linea.OrigenCuenta, base: linea.ComponenteImporte,
    cuenta: linea.IdCuentaContable, rol: linea.CodigoRol,
  }))
  const estado = {
    filtros: [] as Record<string, string>[], evaluaciones: [] as Record<string, string>[], rutasPlantillas: [] as string[],
    creaciones: 0, simulaciones: 0, motivos: [] as string[],
  }
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
      antes: { estado: 'Pendiente' }, despues: { idPlantillaAsiento: 2, vigenciaDesde: '2026-11-22', estado: 'Programada' }, eventos: [],
    })
    if (pathname.endsWith('/aprobaciones/19/rechazar') && req.method() === 'POST') {
      estado.motivos.push(req.postDataJSON().comentario)
      return responder({ idSolicitud: 19, estado: 'Rechazada' })
    }
    if (pathname.endsWith('/fechas-contables/actual')) return responder({ idFechaContable: 1, fecha: '2026-11-20', esDiaContable: true, esFeriado: false, esFinDeSemana: false, horaCorte: '18:00:00' })
    if (pathname === reglas) {
      expect(req.method()).toBe('GET')
      expect(req.postData()).toBeNull()
      estado.evaluaciones.push(Object.fromEntries(searchParams))
      if (opciones.catalogoNoDesplegado && estado.evaluaciones.length === 1) return responder({ detail: 'Not Found' }, 404)
      if (opciones.falloListado && estado.evaluaciones.length === 1) return route.abort('internetdisconnected')
      const agencia = searchParams.get('agencia')
      if (agencia === '999') return responder({ detail: 'Agencia fuera del alcance' }, 403)
      const fecha = searchParams.get('fecha')
      const fechaContable = fecha === '2026-01-01' ? null : fecha ?? '2026-11-20'
      return responder({
        fechaContable, matrizBovedaDisponible: agencia !== '002',
        reglas: [
          ...inventario.map(p => {
            const vigente = fechaContable === null ? null : p.Version === (fechaContable < '2026-11-01' ? 1 : 2)
            return { ...p, vigente, Prioridad: vigente ? 1 : null }
          }),
          ...(agencia !== '002' ? [{
            ...inventario[0], idRegla: 'plantilla:4', IdPlantillaAsiento: 4, IdAgencia: '001',
            CodigoPlantilla: 'BOV_001_TRASLADO_I', Nombre: 'Recepción versionada', Version: 1,
            Origen: 'BOVEDA', CodigoTipoAsiento: 'T2', desde: 'EFECTIVO_EN_TRANSITO', hacia: 'BOVEDA',
            vigente: fechaContable === null ? null : fechaContable >= '2026-11-01',
            Prioridad: fechaContable !== null && fechaContable >= '2026-11-01' ? 1 : null,
          }] : []),
          ...(agencia !== '002' ? [boveda] : []),
        ],
      })
    }
    if (pathname.startsWith(base) && pathname !== `${base}/catalogos`) estado.rutasPlantillas.push(pathname)
    if (pathname === base) {
      estado.filtros.push(Object.fromEntries(searchParams))
      return responder([resumen, anterior])
    }
    if (pathname === `${base}/catalogos`) return responder({
      tiposAsiento: [{ IdTipoAsiento: 3, Codigo: 'DEP', Nombre: 'Depósito', Descripcion: null, EsManual: false, Estado: true }],
      conceptosContables: [{ IdConceptoContable: 7, CodigoConcepto: 'CAP', ConceptoDetalle: resumen.ConceptoDetalle, Estado: true }],
    })
    if (pathname === `${base}/3`) return responder({ ...nueva, lineas: movimientos })
    if (pathname === `${base}/2`) return responder({ ...resumen, lineas: movimientos })
    if (pathname === `${base}/1`) return responder({ ...anterior, lineas: movimientos })
    if (pathname === `${base}/1/solicitudes`) return responder(null)
    if (pathname === `${base}/2/solicitudes`) return responder(opciones.editar === false ? null
      : { idSolicitud: 19, estado: 'Pendiente', puedeAprobar: Boolean(opciones.aprobador), puedeRechazar: Boolean(opciones.aprobador), puedeCancelar: false })
    if (pathname === `${base}/3/solicitudes`) return responder({ idSolicitud: 20, estado: 'Pendiente', puedeAprobar: false, puedeRechazar: false, puedeCancelar: true })
    if (pathname.endsWith('/cuentas-contables')) {
      return responder([cuenta, { ...cuenta, idCuentaContable: 43, codigoCuenta: '11010102', nombreCuenta: 'Cuenta cerrada', estado: 'Inactivo' },
        { ...cuenta, idCuentaContable: 11, idCuentaSuperior: null, codigoCuenta: '110101', nombreCuenta: 'Cuenta agrupadora' },
        { ...cuenta, idCuentaContable: 44, codigoCuenta: '299005', nombreCuenta: 'Cuenta hoja de seis dígitos' }])
    }
    if (pathname === `${base}/simulaciones`) {
      estado.simulaciones++
      expect(req.postDataJSON().producto).toEqual({ CAPITAL: 42 })
      expect(req.postDataJSON().lineas).toEqual(entrada)
      if (opciones.primas) expect(req.postDataJSON().montos).toEqual({ PRIMA_FIJA: '10.50', PRIMA_VARIABLE: '0' })
      return responder({ total: '10.50', lineas: [{ cuenta: 42, lado: 'DEBITO', monto: '10.50' }, { cuenta: 42, lado: 'CREDITO', monto: '10.50' }] })
    }
    if (pathname.endsWith('/tipos-asiento/3/plantillas') && req.method() === 'POST') {
      estado.creaciones++
      expect(req.postDataJSON()).toEqual({ nombre: 'Depósito actualizado', vigenciaDesde: '2026-11-22', codigoPlantilla: 'DEP', lineas: entrada })
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

test('aplica los filtros al inventario y consulta historial por familia desde una pantalla de solo lectura', async ({ page }) => {
  const estado = await simular(page, { editar: false })
  await page.getByLabel('Buscar por nombre o código').fill('Dep')
  await page.getByLabel('Código exacto').fill('OTRO')
  await page.getByLabel('Estado', { exact: true }).selectOption('1')
  await page.getByLabel('Módulo contable', { exact: true }).selectOption('CAJA')
  await page.getByLabel('Tipo de asiento').selectOption({ label: 'Depósito' })
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByText('No encontramos plantillas para los filtros seleccionados.')).toBeVisible()
  await page.getByLabel('Código exacto').fill('DEP')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByRole('row', { name: /Traslado/ })).toHaveCount(0)
  expect(estado.evaluaciones).toEqual([{}])
  await verDetalle(page)
  await expect(page.getByText('11010101 · Caja auxiliar')).toBeVisible()
  await expect(page.getByText('Cuenta del producto · Capital')).toBeVisible()
  await expect(page.getByText('No hay una solicitud visible para esta versión.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preparar nueva versión' })).toHaveCount(0)
  await expect.poll(() => estado.filtros.at(-1)).toEqual({ codigo: 'DEP', idTipoAsiento: '3' })
  await page.getByRole('button', { name: 'Ver versión 1' }).click()
  await expect(page.getByText('DEP · Versión 1')).toBeVisible()
})

test('avisa si el catálogo aún no está desplegado y permite reintentar', async ({ page }) => {
  const estado = await simular(page, { catalogoNoDesplegado: true })
  await expect(page.getByRole('region', { name: 'Listado de plantillas' }).getByRole('alert')).toContainText('El catálogo de reglas contables todavía no está disponible en este entorno.')
  await expect(page.getByRole('region', { name: 'Resultados de plantillas' })).toHaveCount(0)
  expect(estado.rutasPlantillas).toEqual([])
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByRole('region', { name: 'Resultados de plantillas' })).toBeVisible()
})

test('ordena los filtros y permite recorrer el listado horizontal con el teclado', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await simular(page)
  await expect(page.getByLabel('Módulo contable').getByRole('option')).toHaveText(['Todos', 'Bóveda', 'Caja'])
  await expect(page.getByLabel('Tipo de asiento').getByRole('option')).toHaveText(['Todos', 'Depósito', 'Tipo de asiento · T2', 'Tipo de asiento · T10'])

  const listado = page.getByRole('region', { name: 'Resultados de plantillas' })
  const posicion = () => listado.evaluate(elemento => elemento.scrollLeft)
  await page.getByRole('button', { name: 'Buscar', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Desplazar tabla a la izquierda' })).toBeFocused()
  await page.keyboard.press('Tab')
  const derecha = page.getByRole('button', { name: 'Desplazar tabla a la derecha' })
  await expect(derecha).toBeFocused()
  await expect(derecha).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect.poll(posicion).toBeGreaterThan(0)
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Space')
  await expect.poll(posicion).toBe(0)
  await page.keyboard.press('Tab')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Ver Depósito de caja, versión 2' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Depósito de caja' })).toBeFocused()
})

test('muestra Bóveda junto a las versiones y consulta sus cuentas sin acciones E4-03', async ({ page }) => {
  const estado = await simular(page)
  const version = page.getByRole('row', { name: /Depósito de caja.*No seleccionada/ })
  await expect(version.getByText('Usada', { exact: true })).toBeVisible()
  await expect(version.getByText('Sin verificar', { exact: true })).toBeVisible()
  const versionBoveda = page.getByRole('row', { name: /Recepción versionada/ })
  await expect(versionBoveda).toHaveCount(1)
  await expect(versionBoveda.getByText('Agencia 001')).toBeVisible()
  await expect(versionBoveda.getByText('Plantilla versionada')).toBeVisible()
  await expect(versionBoveda.getByText('Efectivo en tránsito')).toBeVisible()
  const fila = page.getByRole('row', { name: /Traslado.*Matriz de Bóveda/ })
  await expect(fila).toHaveCount(1)
  await expect(fila.getByText('Agencia 001')).toBeVisible()
  await expect(fila.getByText('Pendiente', { exact: true })).toBeVisible()
  await expect(fila.getByText('Configurada', { exact: true })).toBeVisible()
  await expect(fila.getByText('No habilitada', { exact: true })).toBeVisible()
  await expect(fila.getByText('No aplica', { exact: true })).toBeVisible()
  await expect(page.getByText(/Durante el corte parcial, ambas etapas usan la matriz/)).toBeVisible()
  await fila.getByRole('button').click()
  await expect(page.getByRole('heading', { name: 'Traslado de efectivo' })).toBeFocused()
  await expect(page.getByText('11010101', { exact: true })).toBeVisible()
  await expect(page.getByText('Sin cuenta', { exact: true })).toBeVisible()
  await expect(page.getByText('Inactivo', { exact: true })).toBeVisible()
  await expect(page.getByText('Regla de Bóveda de solo consulta.')).toBeVisible()
  await expect(page.getByText(/Preparar nueva versión|Simular movimientos|Solicitud de aprobación/)).toHaveCount(0)
  expect(estado.rutasPlantillas).toEqual([])
})

test('envía fecha y agencia y conserva el inventario general con fecha y matriz no disponibles', async ({ page }) => {
  const estado = await simular(page)
  await page.getByLabel('Fecha de evaluación').fill('2026-10-15')
  await page.getByLabel('Agencia de Bóveda').fill('001')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  const versionUsada = page.getByRole('row', { name: /Depósito de caja.*\bUsada\b/ })
  await expect(versionUsada.getByText('Vigente', { exact: true })).toBeVisible()
  expect(estado.evaluaciones.at(-1)).toEqual({ fecha: '2026-10-15', agencia: '001' })
  await page.getByLabel('Fecha de evaluación').fill('2026-01-01')
  await page.getByLabel('Agencia de Bóveda').fill('002')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByText('Fecha de evaluación: No disponible')).toBeVisible()
  await expect(page.getByText('La matriz de Bóveda no está disponible para este alcance.')).toBeVisible()
  await expect(page.getByText('Sin fecha de evaluación', { exact: true })).toHaveCount(2)
  await expect(page.getByRole('row', { name: /Traslado/ })).toHaveCount(0)
  expect(estado.evaluaciones.at(-1)).toEqual({ fecha: '2026-01-01', agencia: '002' })
  await page.getByLabel('Agencia de Bóveda').fill('999')
  await page.getByRole('button', { name: 'Buscar', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Listado de plantillas' }).getByRole('alert')).toContainText('No tienes permiso para realizar esta acción.')
  await expect(page.getByRole('region', { name: 'Resultados de plantillas' })).toHaveCount(0)
})

test('simula las primas E4-03, confirma la edición y muestra la solicitud pendiente', async ({ page }) => {
  const estado = await simular(page, { primas: true })
  await verDetalle(page)
  await expect(page.getByRole('link', { name: 'Ver historial de la solicitud' })).toHaveAttribute('href', '/aprobaciones/19')
  await prepararVersion(page)
  await expect(page.getByRole('option', { name: /Cuenta cerrada|Cuenta agrupadora/ })).toHaveCount(0)
  await expect(page.getByRole('option', { name: /Cuenta hoja de seis dígitos/ }).first()).toBeAttached()
  await page.getByText('Simular movimientos').click()
  await page.getByLabel('Importe · Prima fija').fill('10,50')
  await page.getByLabel('Importe · Prima variable').fill('0')
  await page.getByLabel('Cuenta del producto · Capital').selectOption('42')
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
  const estado = await simular(page, { aprobador: true, primas: true })
  await verDetalle(page)
  await page.getByRole('link', { name: 'Gestionar solicitud en Aprobaciones' }).click()
  await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toBeVisible()
  const movimientos = page.getByRole('link', { name: 'Consultar movimientos de la versión' })
  await expect(movimientos).toHaveAttribute('href', '/contabilidad/plantillas?version=2')
  await movimientos.click()
  const lineasVersion = page.getByRole('region', { name: 'Líneas contables de la versión' })
  await expect(lineasVersion.getByText('Prima fija', { exact: true })).toHaveCount(2)
  await expect(lineasVersion.getByText('Prima variable', { exact: true })).toHaveCount(2)
  await page.getByRole('link', { name: 'Gestionar solicitud en Aprobaciones' }).click()
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
  await expect(page.getByRole('region', { name: 'Listado de plantillas' }).getByRole('alert')).toContainText('No pudimos conectarnos con el servidor.')
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await verDetalle(page)
  await expect(page.getByRole('heading', { name: 'Depósito de caja' })).toBeFocused()
  await expect(page.getByRole('region', { name: 'Líneas contables de la versión' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
