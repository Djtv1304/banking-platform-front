import { describe, expect, it } from 'vitest'
import { accesoDatosSensibles, accesoGestionClientes, estadosPermitidos, requiereAprobacionEstado } from '@/features/clientes/lib/gestion-clientes'
import { leerDetalleHistorial } from '@/features/clientes/lib/historial'

describe('E5-05: respaldo por rol de datos sensibles', () => {
  it.each([
    ['ASESOR', true, false], ['SUPERVISOR', true, true], ['ADMIN', true, true], ['CAJERO', false, false], ['AUDITOR', false, false],
  ])('%s: verSensible=%s, exportar con org-exportar=%s', (rol, verSensible, exportar) => {
    expect(accesoDatosSensibles([String(rol)], ['organizacionExportar'])).toEqual({ verSensible, exportar })
  })
  it('exportar exige además el permiso org-exportar', () => {
    expect(accesoDatosSensibles(['SUPERVISOR'], []).exportar).toBe(false)
  })
})

describe('C-04: consultar por rol, cambiar por permiso', () => {
  it.each([
    ['ASESOR', true, false], ['SUPERVISOR', true, true], ['ADMIN', true, true],
    ['AUDITOR', false, true], ['CAJERO', true, false], ['cliente', false, false],
  ])('%s: consulta=%s, historial=%s (rol)', (rol, consulta, historial) => {
    expect(accesoGestionClientes([String(rol)])).toMatchObject({ consulta, historial, edicion: false, estado: false })
  })
  it('editar y cambiar estado dependen de clientes:editar y clientes:estado', () => {
    expect(accesoGestionClientes(['SUPERVISOR'], ['clientesEstado'])).toMatchObject({ edicion: false, estado: true })
    expect(accesoGestionClientes(['ASESOR'], ['clientesEditar', 'clientesEstado'])).toMatchObject({ edicion: true, estado: true })
    expect(accesoGestionClientes([' asesor ', 'auditor'], [])).toEqual({ consulta: true, edicion: false, estado: false, historial: true })
  })
})

describe('transiciones C-04', () => {
  it('permite bloqueo desde Activo y recuperación desde Bloqueado', () => {
    expect(estadosPermitidos('Activo')).toEqual(['Inactivo', 'Suspendido', 'Bloqueado', 'Eliminado'])
    expect(estadosPermitidos('Bloqueado')).toEqual(['Activo', 'Eliminado'])
  })
  it('no activa Pendiente saltándose la evaluación de riesgo', () => {
    expect(estadosPermitidos('Pendiente')).toEqual(['Eliminado'])
  })
  it('no ofrece transición desde Eliminado ni desde un estado desconocido', () => {
    expect(estadosPermitidos('Eliminado')).toEqual([])
    expect(estadosPermitidos('Futuro')).toEqual([])
  })
})

describe('E5-07: transiciones que requieren aprobación', () => {
  it.each([
    ['Activo', 'Bloqueado', true],
    ['Activo', 'Eliminado', true],
    ['Bloqueado', 'Activo', true],
    ['Bloqueado', 'Eliminado', true],
    ['Inactivo', 'Eliminado', true],
    ['Suspendido', 'Eliminado', true],
    ['Activo', 'Inactivo', false],
    ['Activo', 'Suspendido', false],
    ['Inactivo', 'Activo', false],
    ['Suspendido', 'Activo', false],
  ] as const)('desde %s hacia %s requiereAprobacion=%s', (actual, destino, requiere) => {
    expect(requiereAprobacionEstado(actual, destino)).toBe(requiere)
  })
})

describe('historial con formato actual y legado', () => {
  it('muestra el valor nuevo y el motivo de un registro v1', () => {
    expect(leerDetalleHistorial('{"v":1,"valorAnterior":"A","valorNuevo":"B","motivo":"Corrección"}')).toEqual({ nuevo: 'B', motivo: 'Corrección', tieneDetalle: true })
  })
  it('distingue un valor borrado de un valor no disponible', () => {
    expect(leerDetalleHistorial('{"v":1,"valorNuevo":null,"motivo":"Borrado"}').tieneDetalle).toBe(true)
  })
  it.each(['Importación anterior', '{incompleto', '{"v":2,"valorNuevo":"B","motivo":"Otro"}', '{"v":1,"motivo":"Sin valor"}'])('conserva observaciones sin inventar el nuevo valor: %s', (texto) => {
    expect(leerDetalleHistorial(texto)).toEqual({ nuevo: null, motivo: texto, tieneDetalle: false })
  })
})
