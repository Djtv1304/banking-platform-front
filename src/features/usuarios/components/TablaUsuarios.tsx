import { Link } from 'react-router'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'

import { cn } from '@/shared/lib'
import { Badge } from '@/shared/ui'
import { formatRol } from '@/features/auth'
import { useAgencias } from '@/features/catalogos'
import type { CampoOrden, UsuarioResumen } from '@/features/usuarios/api/usuarios.contract'
import { EstadoUsuarioBadge } from '@/features/usuarios/components/EstadoUsuarioBadge'
import type { Orden } from '@/features/usuarios/lib/filtros'
import { etiquetaAgencia, formatearFecha } from '@/features/usuarios/lib/formato'

const COLUMNAS: { label: string; campo?: CampoOrden }[] = [
  { label: 'Usuario', campo: 'username' },
  { label: 'Nombres', campo: 'nombres' },
  { label: 'Apellidos', campo: 'apellidos' },
  { label: 'Correo', campo: 'email' },
  { label: 'Rol' },
  { label: 'Agencia' },
  { label: 'Estado', campo: 'estado' },
  { label: 'Creado', campo: 'fechaCreacion' },
]

interface TablaUsuariosProps {
  usuarios: UsuarioResumen[]
  orden: Orden
  /** Deshabilita el orden mientras llega la respuesta */
  ocupado: boolean
  onOrdenar: (campo: CampoOrden) => void
}

export function TablaUsuarios({ usuarios, orden, ocupado, onOrdenar }: TablaUsuariosProps) {
  const { data: agencias } = useAgencias()
  const nombreAgencia = (idAgencia: string) => {
    const agencia = agencias.find((item) => item.idAgencia === idAgencia)
    return agencia ? etiquetaAgencia(agencia) : idAgencia
  }

  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full min-w-[960px] text-left text-sm transition-opacity', ocupado && 'opacity-60')}>
        <caption className="sr-only">Usuarios internos. Las columnas con flecha se pueden ordenar.</caption>
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            {COLUMNAS.map(({ label, campo }) => {
              const activa = campo !== undefined && orden.campo === campo
              const Icono = !activa ? ChevronsUpDown : orden.direccion === 'asc' ? ArrowUp : ArrowDown
              return (
                <th
                  key={label}
                  scope="col"
                  aria-sort={activa ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : undefined}
                  className="px-3 py-3 font-medium whitespace-nowrap"
                >
                  {campo ? (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => onOrdenar(campo)}
                      className={cn(
                        '-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait',
                        activa && 'text-heading',
                      )}
                    >
                      {label}
                      <Icono aria-hidden className={cn('size-3.5', !activa && 'opacity-50')} />
                    </button>
                  ) : (
                    label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => (
            // Toda la fila abre la ficha: el enlace del usuario la cubre con su ::after
            <tr key={usuario.idUsuario} className="relative border-b border-border transition-colors last:border-b-0 hover:bg-muted/60">
              <td className="px-3 py-3">
                <Link
                  to={`/usuarios/${usuario.idUsuario}`}
                  className="font-semibold text-link outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
                >
                  {usuario.username}
                </Link>
              </td>
              <td className="px-3 py-3 text-heading">{usuario.nombres}</td>
              <td className="px-3 py-3 text-heading">{usuario.apellidos}</td>
              <td className="max-w-56 truncate px-3 py-3 text-muted-foreground" title={usuario.email}>
                {usuario.email}
              </td>
              <td className="px-3 py-3">
                {usuario.roles?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {usuario.roles.map((rol) => <Badge key={rol} className="h-6 bg-info/30 px-2.5 text-foreground">{formatRol(rol)}</Badge>)}
                  </div>
                ) : usuario.rol ? (
                  <Badge className="h-6 bg-info/30 px-2.5 text-foreground">{formatRol(usuario.rol)}</Badge>
                ) : (
                  <span className="text-muted-foreground">Sin rol</span>
                )}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-heading">
                {usuario.idAgencia ? nombreAgencia(usuario.idAgencia) : <span className="text-muted-foreground">Sin agencia</span>}
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-col items-start gap-1">
                  <EstadoUsuarioBadge estado={usuario.estado} />
                  {!usuario.vinculado && (
                    <span className="text-xs whitespace-nowrap text-muted-foreground">Aún no ingresa</span>
                  )}
                </div>
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{formatearFecha(usuario.fechaCreacion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
