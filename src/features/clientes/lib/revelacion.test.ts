import { describe, expect, it } from 'vitest'

import { REVELACION_INICIAL, revelacionReducer, type AccionRevelacion, type EstadoRevelacion } from '@/features/clientes/lib/revelacion'

const datos = { identificacion: '1710034065', email: null, telefonoCelular: null, telefonoConvencional: null, correosSecundarios: null }
const aplicar = (...acciones: AccionRevelacion[]) => acciones.reduce<EstadoRevelacion>(revelacionReducer, REVELACION_INICIAL)

describe('E5-05 · estados de la revelación', () => {
  it('desafío → código → visible, y ocultar borra el valor', () => {
    const visible = aplicar({ tipo: 'abrir' }, { tipo: 'desafio', idDesafio: 'd1' }, { tipo: 'codigo', valor: '12 34-56' }, { tipo: 'verificar' }, { tipo: 'revelado', datos })
    expect(visible).toEqual({ ...REVELACION_INICIAL, fase: 'visible', datos })
    expect(revelacionReducer(visible, { tipo: 'ocultar' })).toEqual(REVELACION_INICIAL)
  })

  it('solo deja dígitos y como máximo 6', () => {
    expect(aplicar({ tipo: 'abrir' }, { tipo: 'codigo', valor: 'a1234567' }).codigo).toBe('123456')
  })

  it('no verifica con un código incompleto', () => {
    const estado = aplicar({ tipo: 'abrir' }, { tipo: 'desafio', idDesafio: 'd1' }, { tipo: 'codigo', valor: '123' }, { tipo: 'verificar' })
    expect(estado.fase).toBe('codigo')
  })

  it('MFA_INVALIDO descarta el desafío; otros errores lo conservan', () => {
    const verificando = aplicar({ tipo: 'abrir' }, { tipo: 'desafio', idDesafio: 'd1' }, { tipo: 'codigo', valor: '123456' }, { tipo: 'verificar' })
    expect(revelacionReducer(verificando, { tipo: 'fallo', mensaje: 'inválido', nuevoCodigo: true })).toMatchObject({ fase: 'codigo', idDesafio: null, codigo: '', error: 'inválido' })
    expect(revelacionReducer(verificando, { tipo: 'fallo', mensaje: 'espera', nuevoCodigo: false })).toMatchObject({ idDesafio: 'd1', error: 'espera' })
  })

  it('una respuesta que llega después de cancelar no se muestra', () => {
    const cancelado = aplicar({ tipo: 'abrir' }, { tipo: 'desafio', idDesafio: 'd1' }, { tipo: 'codigo', valor: '123456' }, { tipo: 'verificar' }, { tipo: 'ocultar' })
    expect(revelacionReducer(cancelado, { tipo: 'revelado', datos })).toEqual(REVELACION_INICIAL)
    expect(revelacionReducer(REVELACION_INICIAL, { tipo: 'desafio', idDesafio: 'd2' })).toEqual(REVELACION_INICIAL)
  })
})
