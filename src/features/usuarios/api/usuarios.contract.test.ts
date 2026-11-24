import { describe, expect, it } from 'vitest'

import {
  cambiarRolSchema,
  crearUsuarioSchema,
  edicionUsuarioSchema,
  paginaUsuariosSchema,
  usuarioDetalleSchema,
} from '@/features/usuarios/api/usuarios.contract'

const VALIDO = {
  username: 'cajero.matriz',
  nombres: 'Kevin Alejandro',
  apellidos: 'Tapia Guerrero',
  email: ' Cajero.Matriz@Coop.local ',
  cedula: '1712345675',
  idAgencia: '001',
  rol: 'CAJERO',
}

describe('crearUsuarioSchema (AUT-06)', () => {
  it('acepta un alta válida y normaliza el correo', () => {
    const result = crearUsuarioSchema.parse(VALIDO)
    expect(result.email).toBe('cajero.matriz@coop.local')
    expect(result.rol).toBe('CAJERO')
  })

  it('rechaza rol vacío o fuera de la lista, cédula inválida y username con espacios', () => {
    expect(crearUsuarioSchema.safeParse({ ...VALIDO, rol: '' }).success).toBe(false)
    expect(crearUsuarioSchema.safeParse({ ...VALIDO, rol: 'GERENTE' }).success).toBe(false)
    expect(crearUsuarioSchema.safeParse({ ...VALIDO, cedula: '1712345670' }).success).toBe(false)
    expect(crearUsuarioSchema.safeParse({ ...VALIDO, username: 'cajero matriz' }).success).toBe(false)
    expect(crearUsuarioSchema.safeParse({ ...VALIDO, idAgencia: '1' }).success).toBe(false)
  })

  it('no envía campos que no son del contrato', () => {
    expect(crearUsuarioSchema.safeParse({ ...VALIDO, password: 'x' }).success).toBe(false)
  })
})

describe('paginaUsuariosSchema (AUT-05)', () => {
  it('lee la respuesta de ejemplo con rol null', () => {
    const page = paginaUsuariosSchema.parse({
      items: [
        {
          idUsuario: 9,
          username: 'cajero.reemplazo',
          nombres: 'Kevin Alejandro',
          apellidos: 'Tapia Guerrero',
          email: 'cajero.reemplazo@coop.local',
          rol: null,
          estado: 'Inactivo',
          idAgencia: '001',
          vinculado: false,
          fechaCreacion: '2026-07-27T09:00:00',
        },
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    })
    expect(page.items[0].rol).toBeNull()
  })

  it('rechaza una respuesta que no es JSON del backend (p. ej. index.html)', () => {
    expect(paginaUsuariosSchema.safeParse('<!doctype html>').success).toBe(false)
  })
})

describe('edicionUsuarioSchema (AUT-08) y cambiarRolSchema (AUT-09)', () => {
  it('acepta cambios parciales de datos, agencia y cada estado', () => {
    expect(edicionUsuarioSchema.safeParse({ nombres: 'Sebas' }).success).toBe(true)
    expect(edicionUsuarioSchema.safeParse({ idAgencia: '002' }).success).toBe(true)
    expect(edicionUsuarioSchema.parse({ estado: 'Activo' })).toEqual({ estado: 'Activo' })
    expect(edicionUsuarioSchema.parse({ estado: 'Inactivo' })).toEqual({ estado: 'Inactivo' })
  })

  it('exige motivo al bloquear y no envía observaciones vacías', () => {
    expect(edicionUsuarioSchema.safeParse({ estado: 'Bloqueado', motivo: '  ' }).success).toBe(false)
    expect(edicionUsuarioSchema.parse({ estado: 'Bloqueado', motivo: ' Riesgo ', observaciones: '' })).toEqual({
      estado: 'Bloqueado',
      motivo: 'Riesgo',
    })
  })

  it('rechaza un PATCH vacío, mezclar estado con datos y un rol fuera de la lista', () => {
    expect(edicionUsuarioSchema.safeParse({}).success).toBe(false)
    expect(edicionUsuarioSchema.safeParse({ estado: 'Activo', nombres: 'X' }).success).toBe(false)
    expect(cambiarRolSchema.safeParse({ rol: 'GERENTE' }).success).toBe(false)
    expect(cambiarRolSchema.parse({ rol: 'AUDITOR' })).toEqual({ rol: 'AUDITOR' })
    expect(cambiarRolSchema.parse({ roles: ['CONTADOR', 'AUDITOR'] })).toEqual({ roles: ['CONTADOR', 'AUDITOR'] })
    expect(cambiarRolSchema.safeParse({ roles: ['AUDITOR', 'AUDITOR'] }).success).toBe(false)
  })
})

it('usuarioDetalleSchema lee el detalle de ejemplo de AUT-07', () => {
  const usuario = usuarioDetalleSchema.parse({
    idUsuario: 29,
    username: 'admin.sebastian',
    nombres: 'Sebas',
    apellidos: 'Toscano',
    email: 'sebas@coop.local',
    rol: 'ADMIN',
    estado: 'Activo',
    idAgencia: '001',
    vinculado: false,
    fechaCreacion: '2026-11-09T04:26:40.093000',
    cedula: '1724016660',
    ultimoAcceso: null,
    estadoInvitacion: 'accepted',
    bloqueo: null,
  })
  expect(usuario.estadoInvitacion).toBe('accepted')
})
