import type { ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/shared/api'
import type { Asiento } from '@/features/contabilidad/api/asientos.contract'
import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import { DetalleAsientoDialog } from '@/features/contabilidad/components/DetalleAsientoDialog'
import { MENSAJE_ASIENTOS_NO_DISPONIBLE } from '@/features/contabilidad/lib/asientos'

const linea = (id: number, idCuenta: number, codigo: string, tipo: 'DEBITO' | 'CREDITO', monto: number) => ({
  idMovimientoContable: id,
  idCuentaContable: idCuenta,
  codigoCuenta: codigo,
  tipoMovimiento: tipo,
  monto,
  idTransaccion: id === 1 ? 77 : null,
  idAgencia: '001',
})

const ASIENTO: Asiento = {
  idAsientoContable: 3,
  numeroAsiento: 'AS-000003',
  fechaAsiento: '2026-11-16',
  idTipoAsiento: 1,
  origen: 'CAJA',
  concepto: 'Depósito en ventanilla',
  totalDebito: 100,
  totalCredito: 100,
  estado: 'CONTABILIZADO',
  idAsientoReversion: null,
  idAgencia: '001',
  detalle: [linea(1, 10, '110105', 'DEBITO', 100), linea(2, 20, '210135', 'CREDITO', 100)],
}

const estado = vi.hoisted(() => ({
  asiento: {} as Record<string, unknown>,
  plan: {} as Record<string, unknown>,
}))

vi.mock('@/features/contabilidad/hooks/useAsientos', () => ({ useAsiento: () => estado.asiento }))
vi.mock('@/features/contabilidad/hooks/usePlanCuentas', () => ({ usePlanCuentas: () => estado.plan }))
vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => <button {...props}>{children}</button>,
  Badge: ({ children }: ComponentProps<'span'>) => <span>{children}</span>,
  Aviso: ({ children }: ComponentProps<'div'>) => <div role="alert">{children}</div>,
  Cargando: ({ texto }: { texto: string }) => <div>{texto}</div>,
  Dialog: ({ children, open }: ComponentProps<'div'> & { open: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: ComponentProps<'div'>) => <div>{children}</div>,
  DialogHeader: ({ children }: ComponentProps<'div'>) => <div>{children}</div>,
  DialogTitle: ({ children }: ComponentProps<'h2'>) => <h2>{children}</h2>,
  DialogDescription: ({ children }: ComponentProps<'p'>) => <p>{children}</p>,
}))

const cuenta = (id: number, codigo: string, nombre: string): CuentaContable => ({
  idCuentaContable: id,
  codigoCuenta: codigo,
  nombreCuenta: nombre,
  naturaleza: 'DEUDORA',
  tipoCuenta: 'ACTIVO',
  idCuentaSuperior: null,
  esImputable: true,
  saldo: 0,
  estado: 'Activo',
})

const html = (idAsiento: number | null = 3) =>
  renderToStaticMarkup(
    <DetalleAsientoDialog idAsiento={idAsiento} agencias={new Map([['001', '001 · Matriz']])} onCerrar={vi.fn()} onAbrir={vi.fn()} />,
  )

beforeEach(() => {
  estado.asiento = { isPending: false, isError: false, data: ASIENTO }
  estado.plan = { data: [cuenta(10, '110105', 'Caja general'), cuenta(20, '210135', 'Depósitos a la vista')] }
})

describe('DetalleAsientoDialog', () => {
  it('no pinta nada si no hay un asiento abierto', () => {
    expect(html(null)).toBe('')
  })

  it('muestra la cabecera y las líneas con el nombre de la cuenta, en columnas de débito y crédito', () => {
    const salida = html()
    expect(salida).toContain('AS-000003')
    expect(salida).toContain('16/11/2026')
    expect(salida).toContain('001 · Matriz')
    expect(salida).toContain('110105 · Caja general')
    expect(salida).toContain('210135 · Depósitos a la vista')
    expect(salida).toContain('Transacción n.º 77')
    expect(salida).toContain('scope="col"')
    expect(salida).toContain('Totales')
    expect(salida).not.toContain('no cuadra')
  })

  it('si el plan de cuentas no está disponible muestra solo el código', () => {
    estado.plan = { data: undefined, isError: true }
    const salida = html()
    expect(salida).toContain('110105')
    expect(salida).not.toContain('Caja general')
  })

  it('avisa si los débitos y los créditos no son iguales', () => {
    estado.asiento = {
      isPending: false,
      isError: false,
      data: { ...ASIENTO, detalle: [linea(1, 10, '110105', 'DEBITO', 100), linea(2, 20, '210135', 'CREDITO', 90)] },
    }
    const salida = html()
    expect(salida).toContain('Este asiento no cuadra')
    expect(salida).toContain('no son iguales')
  })

  it('enlaza al asiento original si es un reverso', () => {
    estado.asiento = { isPending: false, isError: false, data: { ...ASIENTO, estado: 'CONTABILIZADO', idAsientoReversion: 9 } }
    expect(html()).toContain('Reverso: ver el asiento original')
  })

  it('muestra los estados de carga, sin líneas y error', () => {
    estado.asiento = { isPending: true, isError: false, data: undefined }
    expect(html()).toContain('Cargando el asiento')
    estado.asiento = { isPending: false, isError: false, data: { ...ASIENTO, detalle: [] } }
    expect(html()).toContain('no tiene líneas registradas')
    estado.asiento = {
      isPending: false,
      isError: true,
      data: undefined,
      error: new ApiError('Not Found', 404, 'HTTP_404'),
      refetch: vi.fn(),
    }
    const salida = html()
    expect(salida).toContain(MENSAJE_ASIENTOS_NO_DISPONIBLE)
    expect(salida).toContain('Reintentar')
  })
})
