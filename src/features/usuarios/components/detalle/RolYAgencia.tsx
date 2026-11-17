import { AgenciasUsuarioPanel } from '@/features/usuarios/components/detalle/AgenciasUsuarioPanel'
import { useState, type ReactNode } from 'react'
import { Building2, KeyRound } from 'lucide-react'

import { Button } from '@/shared/ui'
import { formatRol } from '@/features/auth'
import { useAgencias } from '@/features/catalogos'
import type { UsuarioDetalle } from '@/features/usuarios/api/usuarios.contract'
import { Bloque } from '@/features/usuarios/components/detalle/Bloques'
import { CambiarAgenciaDialog } from '@/features/usuarios/components/detalle/CambiarAgenciaDialog'
import { CambiarRolDialog } from '@/features/usuarios/components/detalle/CambiarRolDialog'

interface RolYAgenciaProps {
  usuario: UsuarioDetalle
  esPropio: boolean
  onGuardado: (mensaje: string) => void
}

/** Qué opera (rol, AUT-09) y dónde (agencia, AUT-08): cada uno con su propio cambio */
export function RolYAgencia({ usuario, esPropio, onGuardado }: RolYAgenciaProps) {
  const [dialogo, setDialogo] = useState<'rol' | 'agencia' | null>(null)
  const { data: agencias } = useAgencias()
  const agencia = agencias.find((item) => item.idAgencia === usuario.idAgencia)

  const guardado = (mensaje: string) => {
    setDialogo(null)
    onGuardado(mensaje)
  }

  return (
    <Bloque id="rol-agencia" titulo="Rol y agencia">
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
        <Fila
          Icon={KeyRound}
          titulo="Rol"
          valor={usuario.rol ? formatRol(usuario.rol) : 'Sin rol asignado'}
          sinValor={!usuario.rol}
          nota="Define los módulos que puede operar."
          accion={
            <Button variant="outline" size="lg" onClick={() => setDialogo('rol')} className="rounded-lg px-3">
              {usuario.rol ? 'Cambiar' : 'Asignar'}
            </Button>
          }
        />
        <Fila
          Icon={Building2}
          titulo="Agencia principal"
          valor={agencia ? agencia.nombre : usuario.idAgencia ? `Agencia ${usuario.idAgencia}` : 'Sin agencia asignada'}
          sinValor={!usuario.idAgencia}
          nota={
            agencia
              ? `Código ${agencia.idAgencia}${agencia.ciudad ? `, ${agencia.ciudad}` : ''}${agencia.estado !== 'A' ? '. La agencia no está activa.' : ''}`
              : 'Donde registra sus operaciones.'
          }
          accion={
            <Button variant="outline" size="lg" disabled={usuario.rol !== 'CAJERO'} onClick={() => setDialogo('agencia')} className="rounded-lg px-3">
              {usuario.idAgencia ? 'Cambiar' : 'Asignar'}
            </Button>
          }
        />
      </ul>

      <AgenciasUsuarioPanel idUsuario={usuario.idUsuario} rol={usuario.rol} onGuardado={onGuardado} />
      <CambiarRolDialog
        usuario={usuario}
        esPropio={esPropio}
        open={dialogo === 'rol'}
        onOpenChange={(abierto) => setDialogo(abierto ? 'rol' : null)}
        onGuardado={guardado}
      />
      <CambiarAgenciaDialog
        usuario={usuario}
        open={dialogo === 'agencia'}
        onOpenChange={(abierto) => setDialogo(abierto ? 'agencia' : null)}
        onGuardado={guardado}
      />
    </Bloque>
  )
}

function Fila({
  Icon,
  titulo,
  valor,
  sinValor,
  nota,
  accion,
}: {
  Icon: typeof KeyRound
  titulo: string
  valor: string
  sinValor: boolean
  nota: string
  accion: ReactNode
}) {
  return (
    <li className="flex flex-wrap items-center gap-4 p-4 sm:px-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">{titulo}</span>
        <span className={sinValor ? 'font-medium text-muted-foreground' : 'text-[17px] font-semibold text-heading'}>{valor}</span>
        <span className="text-sm text-muted-foreground">{nota}</span>
      </div>
      {accion}
    </li>
  )
}
