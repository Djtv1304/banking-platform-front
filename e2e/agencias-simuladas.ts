import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'

import { sanitizeReturnTo } from '../src/features/auth/lib/return-to.ts'

import type { AgenciaCreate, AgenciaDetalle, AgenciaUpdate } from '../src/features/organizacion/api/agencias.contract.ts'
import type { DetalleSolicitud } from '../src/features/aprobaciones/api/aprobaciones.contract.ts'

const API = '/api/v1'
const AGENCIAS = API + '/organizacion/agencias'
const APROBACIONES = API + '/aprobaciones'
const CIUDADES = [{ idCiudad: 17, codigoPais: 'ECU', nombre: 'Quito', provincia: 'Pichincha' }]
const USUARIOS = {
  solicitante: { sujeto: 'user_sim_solicitante', nombre: 'Ana Solicitante', idInterno: 1 },
  aprobador: { sujeto: 'user_sim_aprobador', nombre: 'Luis Aprobador', idInterno: 2 },
  asesor: { sujeto: 'user_sim_asesor', nombre: 'Eva Asesora', idInterno: 3 },
}
type Usuario = keyof typeof USUARIOS

async function leerJson<T>(req: IncomingMessage): Promise<T> {
  const partes: Buffer[] = []
  for await (const parte of req) partes.push(Buffer.from(parte))
  return JSON.parse(Buffer.concat(partes).toString('utf8')) as T
}

function crearFicha(idAgencia: string, body: AgenciaCreate, estado: AgenciaDetalle['estado'] = 'I'): AgenciaDetalle {
  return {
    ...body, idAgencia, estado, telefono: body.telefono ?? null, direccion: body.direccion ?? null,
    fechaCreacion: new Date().toISOString(), vinculadaWorkos: false,
  }
}

/** Datos en memoria para el servidor de desarrollo iniciado en modo simulado. */
export function agenciasSimuladas(): Plugin {
  const agencias = [
    crearFicha('001', { codigo: 'MATRIZ', tipoAgencia: 'Matriz', idCiudad: 17 }, 'A'),
    crearFicha('002', { codigo: 'SUC-CAJA', tipoAgencia: 'Sucursal', idCiudad: 17 }, 'A'),
    crearFicha('003', { codigo: 'SUC-NORTE', tipoAgencia: 'Sucursal', idCiudad: 17 }, 'A'),
    crearFicha('004', { codigo: 'SUC-SUR', tipoAgencia: 'Sucursal', idCiudad: 17 }),
  ]
  const solicitudes: DetalleSolicitud[] = []

  function vista(s: DetalleSolicitud, usuario: Usuario): DetalleSolicitud {
    const propia = s.solicitante.sujeto === USUARIOS[usuario].sujeto
    const pendiente = s.estado === 'Pendiente'
    return { ...s, puedeAprobar: pendiente && !propia, puedeRechazar: pendiente && !propia, puedeCancelar: pendiente && propia }
  }

  return {
    name: 'agencias-simuladas',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const ruta = url.pathname
        if (!ruta.startsWith(API + '/')) return next()

        const responder = (estado: number, data?: unknown) => {
          res.statusCode = estado
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(data === undefined ? undefined : JSON.stringify(data))
        }
        const problema = (status: number, codigo: string, detail: string, extra = {}) =>
          responder(status, { status, codigo, detail, ...extra })

        const sesion = (req.headers.cookie ?? '').match(/(?:^|;\s*)e010_usuario=(solicitante|aprobador|asesor)(?:;|$)/)?.[1] as Usuario | undefined

        if (ruta === API + '/auth/login') {
          const candidato = url.searchParams.get('usuario')
          const usuario = candidato === 'aprobador' || candidato === 'asesor' ? candidato : 'solicitante'
          const destino = sanitizeReturnTo(url.searchParams.get('return_to'))
          const retorno = new URL(destino ?? '/organizacion/agencias', url.origin)
          const interno = retorno.origin === url.origin
          res.setHeader('Set-Cookie', `e010_usuario=${usuario}; HttpOnly; SameSite=Strict; Path=/`)
          res.setHeader('Location', interno ? retorno.pathname + retorno.search + retorno.hash : '/organizacion/agencias')
          return responder(302)
        }

        if (ruta === API + '/auth/logout') {
          res.setHeader('Set-Cookie', 'e010_usuario=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
          return responder(200, { logoutUrl: '/login' })
        }
        if (!sesion) return problema(401, 'NO_AUTENTICADO', 'Inicia sesión.')
        const usuario = USUARIOS[sesion]
        const admin = sesion === 'solicitante'
        const accesoAprobaciones = sesion !== 'asesor'
        const rol = admin ? 'admin' : sesion === 'aprobador' ? 'supervisor' : 'asesor'
        const activas = agencias.filter((agencia) => agencia.estado === 'A')
        if (ruta === API + '/auth/me') return responder(200, {
          idUsuario: usuario.sujeto, nombre: usuario.nombre, email: `${sesion}@simulado.invalid`,
          idOrganizacion: null, idAgencia: null, roles: [rol], permisos: accesoAprobaciones ? ['agencias:aprobar'] : [],
        })
        if (ruta === API + '/auth/refresh') return responder(204)
        if (ruta === API + '/auth/agencias') return responder(200, {
          idAgencia: null, idAgenciaPrincipal: null, agenciasAsignadas: [], agenciasPermitidas: activas,
          requiereSeleccionAgencia: false, alcanceGlobal: admin,
        })
        if (ruta === API + '/catalogos/paises/ECU/ciudades') return responder(200, CIUDADES)
        if (ruta === API + '/catalogos/agencias') return responder(200, activas.map((agencia) => ({
          ...agencia, nombre: agencia.codigo, ciudad: CIUDADES[0].nombre, provincia: CIUDADES[0].provincia,
        })))

        try {
          if (ruta === AGENCIAS || ruta.startsWith(AGENCIAS + '/')) {
            if (!admin) return problema(403, 'SIN_PERMISO', 'No tienes permiso para administrar agencias.')
            const [, id, recurso] = ruta.slice(AGENCIAS.length).split('/')
            const agencia = agencias.find((item) => item.idAgencia === id)

            if (req.method === 'GET' && !id) return responder(200, agencias.filter((item) =>
              !url.searchParams.has('estado') || item.estado === url.searchParams.get('estado')))
            if (req.method === 'POST' && !id) {
              const body = await leerJson<AgenciaCreate>(req)
              if (agencias.some((item) => item.codigo === body.codigo)) return problema(409, 'CODIGO_DUPLICADO', 'Ya existe ese código.')
              const creada = crearFicha(String(agencias.length + 1).padStart(3, '0'), body)
              agencias.push(creada)
              return responder(201, creada)
            }
            if (!agencia) return problema(404, 'AGENCIA_NO_ENCONTRADA', 'No existe la agencia.')
            if (req.method === 'GET' && !recurso) return responder(200, agencia)
            if (req.method === 'PATCH' && !recurso) {
              const body = await leerJson<AgenciaUpdate>(req)
              if (agencias.some((item) => item !== agencia && item.codigo === body.codigo)) return problema(409, 'CODIGO_DUPLICADO', 'Ya existe ese código.')
              Object.assign(agencia, body)
              return responder(200, agencia)
            }
            if (req.method === 'PATCH' && recurso === 'estado') {
              const body = await leerJson<{ estado: 'A' | 'I'; motivo: string }>(req)
              if (body.estado === 'A') {
                agencia.estado = 'A'
                return responder(200, { idAgencia: id, estado: agencia.estado })
              }
              if (agencia.tipoAgencia === 'Matriz') return problema(409, 'MATRIZ_NO_DESACTIVABLE', 'La Matriz no se puede desactivar.')
              if (id === '002') return problema(409, 'AGENCIA_CON_OPERACION', 'La agencia tiene operaciones activas.', {
                bloqueos: ['jornadas de caja abiertas', 'bóvedas activas'],
              })
              if (solicitudes.some((s) => s.idObjetivo === id && s.estado === 'Pendiente')) {
                return problema(409, 'SOLICITUD_EN_CURSO', 'Ya existe una solicitud pendiente para esta agencia.')
              }
              const idSolicitud = solicitudes.length + 1
              const fechaSolicitud = new Date().toISOString()
              solicitudes.push({
                idSolicitud, codigoTransaccion: 'ORG-AGENCIA-EDITAR', tipoObjetivo: 'Agencia',
                idObjetivo: id, idAgencia: id, estado: 'Pendiente', fechaSolicitud, solicitante: usuario,
                resolutor: null, fechaResolucion: null, comentario: null, codigoError: null,
                puedeAprobar: false, puedeRechazar: false, puedeCancelar: true,
                antes: { ...agencia }, despues: { ...agencia, estado: 'I' },
                eventos: [{ estadoAnterior: null, estadoNuevo: 'Pendiente', responsable: usuario, comentario: body.motivo, fechaEvento: fechaSolicitud }],
              })
              return responder(202, { idSolicitud, estado: 'Pendiente', requiereAprobacion: true })
            }
          }

          if (ruta === APROBACIONES || ruta.startsWith(APROBACIONES + '/')) {
            const pendientes = solicitudes.filter((s) => accesoAprobaciones && vista(s, sesion).puedeAprobar)
            const conteos = { pendientesParaMi: pendientes.length, diasResaltar: 7 }
            if (ruta === APROBACIONES + '/accesos') return responder(200, { puedeVer: accesoAprobaciones, puedeSolicitar: admin, ...conteos })
            if (!accesoAprobaciones) return problema(403, 'SIN_PERMISO', 'No tienes acceso a esta bandeja.')
            if (ruta === APROBACIONES && req.method === 'GET') {
              const bandeja = url.searchParams.get('bandeja')
              const page = Number(url.searchParams.get('page')) || 1
              const items = bandeja === 'mias' ? solicitudes.filter((s) => s.solicitante.sujeto === usuario.sujeto)
                : bandeja === 'resueltas' ? solicitudes.filter((s) => s.estado !== 'Pendiente') : pendientes
              return responder(200, { items: items.slice((page - 1) * 20, page * 20).map((s) => vista(s, sesion)), total: items.length, page, pageSize: 20, ...conteos })
            }
            const [, id, accion] = ruta.slice(APROBACIONES.length).split('/')
            const s = solicitudes.find((item) => item.idSolicitud === Number(id))
            if (!s) return problema(404, 'SOLICITUD_NO_ENCONTRADA', 'No existe la solicitud.')
            if (req.method === 'GET' && !accion) return responder(200, vista(s, sesion))
            if (req.method === 'POST' && (accion === 'aprobar' || accion === 'rechazar' || accion === 'cancelar')) {
              const propia = s.solicitante.sujeto === usuario.sujeto
              if (propia && accion === 'aprobar') return problema(403, 'APROBADOR_ES_SOLICITANTE', 'El solicitante no puede aprobar su propia solicitud.')
              if (propia !== (accion === 'cancelar')) return problema(403, 'SIN_PERMISO', 'No tienes permiso para resolver esta solicitud.')
              const { comentario } = await leerJson<{ comentario: string }>(req)
              if (s.estado !== 'Pendiente') return problema(409, 'SOLICITUD_NO_PENDIENTE', 'La solicitud ya fue resuelta.')
              const agencia = agencias.find((item) => item.idAgencia === s.idObjetivo)
              if (accion === 'aprobar' && agencia) agencia.estado = 'I'
              s.estado = accion === 'aprobar' ? 'Ejecutada' : accion === 'rechazar' ? 'Rechazada' : 'Cancelada'
              s.resolutor = usuario
              s.comentario = comentario
              s.fechaResolucion = new Date().toISOString()
              s.eventos.push({ estadoAnterior: 'Pendiente', estadoNuevo: s.estado, responsable: usuario, comentario, fechaEvento: s.fechaResolucion })
              return responder(200, { idSolicitud: s.idSolicitud, estado: s.estado })
            }
          }
          return problema(404, 'RUTA_NO_SIMULADA', 'Esta ruta no está disponible en el modo simulado de agencias.')
        } catch {
          return problema(400, 'DATOS_INVALIDOS', 'No pudimos leer la petición simulada.')
        }
      })
    },
  }
}
