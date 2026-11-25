/** Puntos de entrada y subrutas; el detalle comprueba además cada acción interna. */
export function funcionesDeRuta(ruta: string): readonly string[] | null {
  if (ruta === '/registrar-cliente') return ['clientes.registrar']
  if (ruta === '/clientes-busqueda') return ['clientes.consultar']
  if (/^\/clientes-busqueda\/[^/]+$/.test(ruta)) return ['clientes.consultar', 'clientes.verHistorial', 'clientes.riesgo.consultar']
  if (ruta === '/cuentas/abrir') return ['cuentas.abrir']
  if (/^\/cuentas\/[^/]+\/movimientos$/.test(ruta)) return ['cuentas.verMovimientos']
  if (/^\/cuentas\/[^/]+\/cupos$/.test(ruta)) return ['cuentas.cupos.consultar', 'cuentas.cupos.verHistorial']
  if (ruta === '/cuentas' || /^\/cuentas\/[^/]+$/.test(ruta)) return ['cuentas.consultar']
  if (ruta === '/solicitar-tarjeta') return ['tarjetas.emitir']
  if (ruta === '/tarjetas') return ['tarjetas.consultar']
  if (/^\/tarjetas\/[^/]+$/.test(ruta)) return ['tarjetas.consultar', 'tarjetas.verHistorial']
  if (ruta === '/organizacion/entidad') return ['entidad.consultar']
  if (ruta === '/organizacion/agencias') return ['agencias.consultar']
  if (ruta === '/productos' || ruta.startsWith('/productos/')) return ['productos.consultar']
  if (ruta === '/catalogos') return ['catalogos.consultar']
  if (ruta === '/contabilidad/asientos/nuevo' || /^\/contabilidad\/asientos\/[^/]+\/editar$/.test(ruta)) return ['contabilidad.asientos.crear']
  if (ruta === '/contabilidad/asientos') return ['contabilidad.asientos.consultar']
  if (ruta === '/contabilidad/cuentas-producto') return ['contabilidad.cuentasProducto.consultar']
  if (/^\/contabilidad\/plantillas\/?$/i.test(ruta)) return ['contabilidad.plantillas.consultar']
  if (ruta === '/contabilidad/fecha-contable') return ['contabilidad.fecha.consultar']
  if (ruta === '/contabilidad' || /^\/contabilidad\/importar-catalogo\/?$/.test(ruta)) return ['contabilidad.cuentas.consultar']
  if (ruta === '/usuarios' || ruta.startsWith('/usuarios/')) return ['usuarios.consultar']
  // Seguridad protegida, aprobaciones y módulos no migrados conservan sus reglas.
  return null
}
