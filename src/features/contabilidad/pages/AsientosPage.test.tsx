import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api'
import type { Asiento } from '@/features/contabilidad/api/asientos.contract'
import { MENSAJE_ASIENTOS_NO_DISPONIBLE } from '@/features/contabilidad/lib/asientos'
import { AsientosPage } from '@/features/contabilidad/pages/AsientosPage'

const asiento = (id: number, extra: Partial<Asiento> = {}): Asiento => ({
  idAsientoContable: id,
  numeroAsiento: `AS-00000${id}`,
  fechaAsiento: '2026-11-16',
  idTipoAsiento: 1,
  origen: 'CAJA',
  concepto: `Depósito ${id}`,
  totalDebito: 1250.5,
  totalCredito: 1250.5,
  estado: 'CONTABILIZADO',
  idAsientoReversion: null,
  idAgencia: '001',
  detalle: [],
  ...extra,
})

const estado = vi.hoisted(() => ({
  asientos: {} as Record<string, unknown>,
}))

vi.mock('@/features/contabilidad/hooks/useAsientos', () => ({ useAsientos: () => estado.asientos }))
vi.mock('@/features/catalogos', () => ({
  useAgencias: () => ({
    data: [{ idAgencia: '001', codigo: '001', nombre: 'Matriz', tipoAgencia: 'Matriz', provincia: 'Pichincha', ciudad: 'Quito', estado: 'A' }],
    isLoading: false,
    isError: false,
  }),
}))

vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  Badge: ({ children }: ComponentProps<'span'>) => <span>{children}</span>,
  Input: (props: ComponentProps<'input'>) => <input {...props} />,
  Label: ({ children }: ComponentProps<'label'>) => <label>{children}</label>,
  Aviso: ({ children }: ComponentProps<'div'>) => <div>{children}</div>,
  Cargando: ({ texto }: { texto: string }) => <div>{texto}</div>,
  Paginacion: ({ resumen }: { resumen: string }) => <p>{resumen}</p>,
}))

const html = () => renderToStaticMarkup(<AsientosPage />)

const pagina = (items: Asiento[], total = items.length) => ({
  isPending: false,
  isError: false,
  isFetching: false,
  data: { items, page: 1, pageSize: 20, total },
})

beforeEach(() => {
  estado.asientos = pagina([asiento(1), asiento(2, { estado: 'REVERSADO', idAsientoReversion: 9 })])
})

describe('AsientosPage', () => {
  it('pinta la tabla con montos, agencia y estado, y marca el asiento revertido', () => {
    const salida = html()
    expect(salida).toContain('aria-label="Asientos contables"')
    expect(salida).toContain('AS-000001')
    expect(salida).toContain('Depósito 2')
    expect(salida).toContain('001 · Matriz')
    expect(salida).toContain('1.250,50')
    expect(salida).toContain('Contabilizado')
    expect(salida).toContain('Revertido por el asiento n.º 9')
    expect(salida).toContain('Página 1 de 1 · 2 asientos')
  })

  it('las columnas tienen scope y la fecha viene ordenada de más reciente a más antigua', () => {
    const salida = html()
    expect(salida).toContain('scope="col"')
    expect(salida).toMatch(/aria-sort="descending"[^>]*>.*Fecha/)
  })

  it('muestra los estados de carga y vacío', () => {
    estado.asientos = { isPending: true, isError: false, isFetching: true, data: undefined }
    expect(html()).toContain('Consultando los asientos')
    estado.asientos = pagina([])
    expect(html()).toContain('No hay asientos con esos filtros')
  })

  it('un endpoint sin desplegar se explica sin romper la pantalla', () => {
    estado.asientos = {
      isPending: false,
      isError: true,
      isFetching: false,
      data: undefined,
      error: new ApiError('Not Found', 404, 'HTTP_404'),
      refetch: vi.fn(),
    }
    const salida = html()
    expect(salida).toContain(MENSAJE_ASIENTOS_NO_DISPONIBLE)
    expect(salida).toContain('Reintentar')
    expect(salida).toContain('aria-label="Filtros de asientos"')
  })

  it('un error cualquiera muestra su mensaje y el botón de reintentar', () => {
    estado.asientos = {
      isPending: false,
      isError: true,
      isFetching: false,
      data: undefined,
      error: new ApiError('No pudimos conectarnos con el servidor.', null, 'network_error'),
      refetch: vi.fn(),
    }
    const salida = html()
    expect(salida).toContain('No pudimos conectarnos')
    expect(salida).toContain('Reintentar')
  })
})
