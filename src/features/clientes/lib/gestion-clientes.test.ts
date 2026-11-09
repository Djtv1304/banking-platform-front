import { describe, expect, it } from 'vitest'
import { accesoGestionClientes, estadosPermitidos } from '@/features/clientes/lib/gestion-clientes'
import { leerDetalleHistorial } from '@/features/clientes/lib/historial'

describe('permisos C-04 del backend vigente', () => {
  it.each([
    ['ASESOR', true, true, false], ['SUPERVISOR', false, true, true], ['ADMIN', true, true, true],
    ['AUDITOR', false, false, true], ['CAJERO', false, false, false], ['cliente', false, false, false],
  ])('%s tiene los permisos esperados', (rol, edicion, estado, historial) => {
    expect(accesoGestionClientes([String(rol)])).toMatchObject({ edicion, estado, historial })
  })
  it('normaliza los slugs y combina varios roles sin conceder permisos por defecto', () => {
    expect(accesoGestionClientes([' asesor ', 'auditor'])).toEqual({ consulta: true, edicion: true, estado: true, historial: true })
    expect(accesoGestionClientes([])).toEqual({ consulta: false, edicion: false, estado: false, historial: false })
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

describe('historial con formato actual y legado', () => {
  it('muestra el valor nuevo y el motivo de un registro v1', () => {
    expect(leerDetalleHistorial('{"v":1,"valorAnterior":"A","valorNuevo":"B","motivo":"Corrección"}')).toEqual({ nuevo: 'B', motivo: 'Corrección', tieneDetalle: true })
  })
  it('distingue un valor borrado de un valor no disponible', () => {
    expect(leerDetalleHistorial('{"v":1,"valorNuevo":null,"motivo":"Borrado"}').tieneDetalle).toBe(true)
    expect(leerDetalleHistorial('Importación anterior')).toEqual({ nuevo: null, motivo: 'Importación anterior', tieneDetalle: false })
  })
  it.each(['{incompleto', '{"v":2,"valorNuevo":"B","motivo":"Otro"}', '{"v":1,"motivo":"Sin valor"}'])('conserva observaciones sin inventar el nuevo valor: %s', (texto) => {
    expect(leerDetalleHistorial(texto)).toEqual({ nuevo: null, motivo: texto, tieneDetalle: false })
  })
})
