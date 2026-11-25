import { describe, expect, it } from 'vitest'

import { FILTRO_REQUERIDO } from '@/features/clientes/api/clientes.contract'
import { armarBusqueda, FILTROS_INICIALES } from '@/features/clientes/lib/consulta'

describe('E5-05 · armarBusqueda', () => {
  it('sin filtro (o solo con tipo) no hay búsqueda y se avisa', () => {
    expect(armarBusqueda(FILTROS_INICIALES, 1)).toEqual({ params: null, aviso: FILTRO_REQUERIDO })
    expect(armarBusqueda({ ...FILTROS_INICIALES, tipoCliente: 'Juridico' }, 1).params).toBeNull()
  })

  it('omite los vacíos y recorta el texto', () => {
    expect(armarBusqueda({ ...FILTROS_INICIALES, nombre: '  perez ', idAgenciaRegistro: '002', tipoCliente: 'Natural' }, 2)).toEqual({
      params: { page: 2, pageSize: 20, sort: 'fechaRegistro,desc', nombre: 'perez', idAgenciaRegistro: '002', tipoCliente: 'Natural' },
      aviso: null,
    })
  })

  it('avisa si el nombre tiene menos de 3 letras', () => {
    expect(armarBusqueda({ ...FILTROS_INICIALES, nombre: 'pe' }, 1).aviso).toContain('al menos 3')
  })
})
