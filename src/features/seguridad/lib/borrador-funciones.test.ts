import { describe, expect, it } from 'vitest'
import type { ConfiguracionFunciones } from '@/features/seguridad/api/funciones.api'
import { cambiarCelda, claveFuncion, dependenciasFaltantes, fusionarBorrador } from '@/features/seguridad/lib/borrador-funciones'

const base: ConfiguracionFunciones = {
  version: 'a'.repeat(64), activa: true, modelo: 'FUNCIONES_POR_ROL', roles: ['ADMIN', 'SUPERVISOR'], ajustes: [],
  funciones: [
    { id: 'clientes.consultar', nombre: 'Consultar clientes', modulo: 'Clientes', rutas: ['/clientes-busqueda'], rolesIniciales: ['ADMIN', 'SUPERVISOR'], delegable: true, motivoProteccion: null, dependencias: [] },
    { id: 'clientes.editar', nombre: 'Editar clientes', modulo: 'Clientes', rutas: ['/clientes-busqueda'], rolesIniciales: ['ADMIN'], delegable: true, motivoProteccion: null, dependencias: ['clientes.consultar'] },
  ],
}
const consultar = claveFuncion('clientes.consultar', 'SUPERVISOR')
const editar = claveFuncion('clientes.editar', 'SUPERVISOR')

describe('Borradores y concurrencia del editor', () => {
  it('incorpora otro campo sin perder el cambio propio', () => {
    const servidor = { ...base, version: 'b'.repeat(64), ajustes: [{ funcion: 'clientes.consultar', rol: 'ADMIN', permitido: false }] }
    const resultado = fusionarBorrador(base, servidor, { [editar]: true })
    expect(resultado.borrador).toEqual({ [editar]: true })
    expect(resultado.conflictos).toEqual([])
    expect(servidor.ajustes[0].permitido).toBe(false)
  })
  it('no inventa un conflicto si ambas personas ya hicieron el mismo cambio', () => {
    const servidor = { ...base, version: 'b'.repeat(64), ajustes: [{ funcion: 'clientes.editar', rol: 'SUPERVISOR', permitido: true }] }
    const resultado = fusionarBorrador(base, servidor, { [editar]: true })
    expect(resultado.borrador).toEqual({})
    expect(resultado.conflictos).toEqual([])
    expect(resultado.coincidencias).toBe(1)
  })
  it('conserva ambas propuestas incompatibles para que una persona decida', () => {
    const anterior = { ...base, ajustes: [{ funcion: 'clientes.editar', rol: 'SUPERVISOR', permitido: false }] }
    const servidor = { ...base, version: 'b'.repeat(64) }
    const resultado = fusionarBorrador(anterior, servidor, { [editar]: true })
    expect(resultado.borrador[editar]).toBe(true)
    expect(resultado.conflictos).toMatchObject([{ guardado: null, propuesto: true, anterior: false, bloqueado: false }])
  })
  it('protege el borrador cuando una función desaparece del catálogo', () => {
    const servidor = { ...base, version: 'b'.repeat(64), funciones: base.funciones.slice(0, 1) }
    const resultado = fusionarBorrador(base, servidor, { [editar]: true })
    expect(resultado.conflictos[0].bloqueado).toBe(true)
    expect(resultado.borrador[editar]).toBe(true)
  })
  it('requiere revisar un restablecimiento si cambió el valor inicial', () => {
    const servidor = { ...base, version: 'b'.repeat(64), funciones: base.funciones.map((f) => ({ ...f, rolesIniciales: [] })) }
    const resultado = fusionarBorrador(base, servidor, { [consultar]: null })
    expect(resultado.conflictos).toHaveLength(1)
  })
  it('descartar un campo no borra modificaciones de otro rol', () => {
    const otro = claveFuncion('clientes.editar', 'ADMIN')
    expect(cambiarCelda(base, { [editar]: true, [otro]: false }, 'clientes.editar', 'SUPERVISOR', null)).toEqual({ [otro]: false })
  })
  it('explica por qué no se puede conceder una escritura sin su consulta', () => {
    expect(dependenciasFaltantes(base, { [editar]: true, [consultar]: false })).toEqual([
      { rol: 'SUPERVISOR', funcion: 'Editar clientes', requiere: 'Consultar clientes' },
    ])
  })
})
