import { usePuedeFuncion, usePermisos, hasPermission, PERMISOS } from '@/features/auth'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Lock, Pencil } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Button, Input } from '@/shared/ui'
import { mensajeErrorCambio } from '@/features/usuarios/api/usuarios.api'
import {
  editarDatosSchema,
  USUARIO_LIMITES,
  type EditarDatos,
  type EditarDatosInput,
  type UsuarioDetalle,
} from '@/features/usuarios/api/usuarios.contract'
import { Campo } from '@/features/usuarios/components/Campo'
import { Bloque, Dato, ErrorAccion } from '@/features/usuarios/components/detalle/Bloques'
import { useEditarUsuario } from '@/features/usuarios/hooks/useUsuarios'
import { ariaCampo, campoClassName } from '@/features/usuarios/lib/campos'
import { nombreCampo } from '@/features/usuarios/lib/formato'

const valores = (usuario: UsuarioDetalle): EditarDatosInput => ({
  nombres: usuario.nombres,
  apellidos: usuario.apellidos,
  email: usuario.email,
})

/** Solo los campos que cambiaron (AUT-08 es un PATCH parcial) */
function cambios(usuario: UsuarioDetalle, datos: EditarDatos) {
  const anteriores = valores(usuario)
  return Object.fromEntries(
    (Object.keys(datos) as (keyof EditarDatos)[])
      .filter((campo) => datos[campo] !== anteriores[campo].trim())
      .map((campo) => [campo, datos[campo]]),
  ) as Partial<EditarDatos>
}

interface DatosPersonalesProps {
  usuario: UsuarioDetalle
  onGuardado: (mensaje: string) => void
}

/** Nombres, apellidos y correo se editan aquí; usuario y cédula identifican a la persona y no cambian */
export function DatosPersonales({ usuario, onGuardado }: DatosPersonalesProps) {
  const puedeEditar = usePuedeFuncion('usuarios.administrar', hasPermission(usePermisos(), PERMISOS.usuariosEditar))
  const [editando, setEditando] = useState(false)

  return (
    <Bloque
      id="datos-personales"
      titulo="Datos personales"
      accion={
        puedeEditar && !editando && (
          <Button variant="outline" size="lg" onClick={() => setEditando(true)} className="rounded-lg px-3">
            <Pencil />
            Editar
          </Button>
        )
      }
    >
      {editando && puedeEditar ? (
        <FormularioDatos
          usuario={usuario}
          onCancelar={() => setEditando(false)}
          onGuardado={(mensaje) => {
            setEditando(false)
            onGuardado(mensaje)
          }}
        />
      ) : (
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Dato label="Nombres">{usuario.nombres}</Dato>
          <Dato label="Apellidos">{usuario.apellidos}</Dato>
          <Dato label="Correo electrónico" nota="Correo de su cuenta de acceso.">
            {usuario.email}
          </Dato>
          <Dato label="Cédula">{usuario.cedula || 'Sin registrar'}</Dato>
          <Dato label="Usuario">{usuario.username}</Dato>
        </dl>
      )}
    </Bloque>
  )
}

function FormularioDatos({
  usuario,
  onCancelar,
  onGuardado,
}: {
  usuario: UsuarioDetalle
  onCancelar: () => void
  onGuardado: (mensaje: string) => void
}) {
  const edicion = useEditarUsuario(usuario.idUsuario)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<EditarDatosInput, unknown, EditarDatos>({
    resolver: zodResolver(editarDatosSchema),
    defaultValues: valores(usuario),
    shouldFocusError: true,
  })
  const pendiente = edicion.isPending
  const error = (campo: keyof EditarDatosInput) => errors[campo]?.message

  const enviar = handleSubmit(async (datos) => {
    const patch = cambios(usuario, datos)
    if (Object.keys(patch).length === 0) {
      onCancelar()
      return
    }
    try {
      await edicion.mutateAsync(patch)
      onGuardado('Guardamos los datos personales.')
    } catch (e) {
      for (const { field, message } of toApiError(e).fields) {
        const campo = nombreCampo(field)
        if (campo in valores(usuario)) setError(campo as keyof EditarDatosInput, { message }, { shouldFocus: true })
      }
    }
  })

  return (
    <form onSubmit={enviar} noValidate aria-label="Editar datos personales" aria-busy={pendiente} className="flex flex-col gap-6">
      <fieldset disabled={pendiente} className="grid min-w-0 gap-5 sm:grid-cols-2">
        <Campo id="editar-nombres" label="Nombres" error={error('nombres')}>
          <Input
            id="editar-nombres"
            autoComplete="off"
            maxLength={USUARIO_LIMITES.nombres}
            className={campoClassName}
            {...ariaCampo('editar-nombres', error('nombres'))}
            {...register('nombres')}
          />
        </Campo>
        <Campo id="editar-apellidos" label="Apellidos" error={error('apellidos')}>
          <Input
            id="editar-apellidos"
            autoComplete="off"
            maxLength={USUARIO_LIMITES.apellidos}
            className={campoClassName}
            {...ariaCampo('editar-apellidos', error('apellidos'))}
            {...register('apellidos')}
          />
        </Campo>
        <div className="sm:col-span-2">
          <Campo
            id="editar-email"
            label="Correo electrónico"
            error={error('email')}
            ayuda="Revisa que sea correcto: es el correo de su cuenta de acceso."
          >
            <Input
              id="editar-email"
              type="email"
              autoComplete="off"
              maxLength={USUARIO_LIMITES.email}
              className={campoClassName}
              {...ariaCampo('editar-email', error('email'), 'Revisa que sea correcto: es el correo de su cuenta de acceso.')}
              {...register('email')}
            />
          </Campo>
        </div>
      </fieldset>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock aria-hidden className="size-4 shrink-0" />
        El usuario ({usuario.username}) y la cédula identifican a la persona y no se pueden cambiar.
      </p>

      {edicion.isError && <ErrorAccion>{mensajeErrorCambio(edicion.error)}</ErrorAccion>}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={pendiente} onClick={onCancelar} className="min-h-11 rounded-xl px-6">
          Cancelar
        </Button>
        <Button type="submit" disabled={pendiente || !isDirty} className="min-h-11 rounded-xl px-6 font-semibold">
          {pendiente && <LoaderCircle className="animate-spin" />}
          {pendiente ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
