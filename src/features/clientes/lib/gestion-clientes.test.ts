import { describe, expect, it } from 'vitest'
import { accesoGestionClientes, estadosPermitidos } from '@/features/clientes/lib/gestion-clientes'
import { leerDetalleHistorial } from '@/features/clientes/lib/historial'

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
