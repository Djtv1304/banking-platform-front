import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, MailPlus } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/shared/ui'
import { useAgencias } from '@/features/catalogos'
import { mensajeErrorCreacion } from '@/features/usuarios/api/usuarios.api'
import {
  crearUsuarioSchema,
  USUARIO_LIMITES,
  type CrearUsuario,
  type CrearUsuarioInput,
  type UsuarioCreado,
} from '@/features/usuarios/api/usuarios.contract'
import { Campo } from '@/features/usuarios/components/Campo'
import { ariaCampo, campoClassName, selectClassName } from '@/features/usuarios/lib/campos'
import { useCrearUsuario } from '@/features/usuarios/hooks/useUsuarios'
import { etiquetaAgencia, nombreCampo, OPCIONES_ROL } from '@/features/usuarios/lib/formato'

const VACIO: CrearUsuarioInput = { username: '', nombres: '', apellidos: '', email: '', cedula: '', idAgencia: '', rol: '' }

const CAMPOS = new Set<string>(Object.keys(VACIO))

interface CrearUsuarioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreado: (usuario: UsuarioCreado) => void
}

/** AUT-06 · El usuario recibe una invitación por correo y define su contraseña al aceptarla */
export function CrearUsuarioDialog({ open, onOpenChange, onCreado }: CrearUsuarioDialogProps) {
  const creacion = useCrearUsuario()
  const agencias = useAgencias()
  const agenciasActivas = agencias.data.filter((agencia) => agencia.estado === 'A')
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<CrearUsuarioInput, unknown, CrearUsuario>({
    resolver: zodResolver(crearUsuarioSchema),
    defaultValues: VACIO,
    shouldFocusError: true,
  })
  const [agregarMas, setAgregarMas] = useState(false)
  const principal = useWatch({ control, name: 'idAgencia' })
  const [adicionales, setAdicionales] = useState<string[]>([])
  const rol = useWatch({ control, name: 'rol' })
  const varias = ['ADMIN', 'SUPERVISOR', 'CONTADOR', 'AUDITOR', 'APROBADOR_CREDITO'].includes(rol)
  const pendiente = creacion.isPending

  const cerrar = () => {
    if (pendiente) return
    reset(VACIO)
    setAdicionales([])
    setAgregarMas(false)
    creacion.reset()
    onOpenChange(false)
  }

  const enviar = handleSubmit(async (datos) => {
    try {
      const idAgencias = [...new Set([datos.idAgencia, ...(varias && agregarMas ? adicionales.filter((id) => id !== datos.idAgencia) : [])])]
      const usuario = await creacion.mutateAsync({ ...datos, idAgencias })
      setAdicionales([])
      setAgregarMas(false)
      reset(VACIO)
      creacion.reset()
      onCreado(usuario)
    } catch (error) {
      // Los errores por campo (409 duplicado, 422 validación) se muestran junto a cada campo
      const e = toApiError(error)
      for (const { field, message } of e.fields) {
        const campo = nombreCampo(field)
        if (CAMPOS.has(campo)) setError(campo as keyof CrearUsuarioInput, { message }, { shouldFocus: true })
      }
    }
  })

  const error = (campo: keyof CrearUsuarioInput) => errors[campo]?.message

  return (
    <Dialog open={open} onOpenChange={(abierto) => (abierto ? onOpenChange(true) : cerrar())}>
      <DialogContent
        showCloseButton={!pendiente}
        // Un clic fuera no debe borrar lo escrito: se cierra con «Cancelar», la X o Escape
        onInteractOutside={(event) => {
          if (isDirty || pendiente) event.preventDefault()
        }}
        className="max-h-[calc(100svh-2rem)] gap-6 overflow-y-auto rounded-3xl border border-border bg-card p-6 sm:max-w-2xl sm:p-8"
      >
        <DialogHeader className="gap-2">
          <DialogTitle className="text-2xl font-bold tracking-tight text-heading">Nuevo usuario</DialogTitle>
          <DialogDescription className="text-base">
            Le enviaremos una invitación al correo. Definirá su contraseña al aceptarla y su cuenta quedará vinculada en
            su primer ingreso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} noValidate aria-label="Datos del nuevo usuario" aria-busy={pendiente} className="flex flex-col gap-6">
          <fieldset disabled={pendiente} className="flex min-w-0 flex-col gap-6">
            <section aria-labelledby="usuario-persona" className="flex flex-col gap-4">
              <h3 id="usuario-persona" className="border-b border-border pb-2 text-base font-semibold text-heading">
                Persona
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <Campo id="usuario-nombres" label="Nombres" error={error('nombres')}>
                  <Input
                    id="usuario-nombres"
                    autoComplete="off"
                    maxLength={USUARIO_LIMITES.nombres}
                    className={campoClassName}
                    {...ariaCampo('usuario-nombres', error('nombres'))}
                    {...register('nombres')}
                  />
                </Campo>
                <Campo id="usuario-apellidos" label="Apellidos" error={error('apellidos')}>
                  <Input
                    id="usuario-apellidos"
                    autoComplete="off"
                    maxLength={USUARIO_LIMITES.apellidos}
                    className={campoClassName}
                    {...ariaCampo('usuario-apellidos', error('apellidos'))}
                    {...register('apellidos')}
                  />
                </Campo>
                <Campo id="usuario-cedula" label="Cédula" error={error('cedula')}>
                  <Input
                    id="usuario-cedula"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={10}
                    className={campoClassName}
                    {...ariaCampo('usuario-cedula', error('cedula'))}
                    {...register('cedula')}
                  />
                </Campo>
                <Campo
                  id="usuario-email"
                  label="Correo electrónico"
                  error={error('email')}
                  ayuda="Aquí llegará la invitación."
                >
                  <Input
                    id="usuario-email"
                    type="email"
                    autoComplete="off"
                    maxLength={USUARIO_LIMITES.email}
                    className={campoClassName}
                    {...ariaCampo('usuario-email', error('email'), 'Aquí llegará la invitación.')}
                    {...register('email')}
                  />
                </Campo>
              </div>
            </section>

            <section aria-labelledby="usuario-acceso" className="flex flex-col gap-4">
              <h3 id="usuario-acceso" className="border-b border-border pb-2 text-base font-semibold text-heading">
                Acceso
              </h3>
              <div className="grid gap-5 sm:grid-cols-2">
                <Campo
                  id="usuario-username"
                  label="Usuario"
                  error={error('username')}
                  ayuda="Sin espacios. Ejemplo: cajero.matriz"
                >
                  <Input
                    id="usuario-username"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={USUARIO_LIMITES.username}
                    className={campoClassName}
                    {...ariaCampo('usuario-username', error('username'), 'Sin espacios. Ejemplo: cajero.matriz')}
                    {...register('username')}
                  />
                </Campo>
                <Campo id="usuario-rol" label="Rol" error={error('rol')}>
                  <select id="usuario-rol" className={selectClassName} {...ariaCampo('usuario-rol', error('rol'))} {...register('rol')}>
                    <option value="" disabled>
                      Elige un rol
                    </option>
                    {OPCIONES_ROL.map((opcion) => (
                      <option key={opcion.value} value={opcion.value}>
                        {opcion.label}
                      </option>
                    ))}
                  </select>
                </Campo>
                <div className="sm:col-span-2">
                  <Campo
                    id="usuario-agencia"
                    label="Agencia"
                    error={error('idAgencia') ?? (agencias.isError ? 'No pudimos cargar las agencias.' : undefined)}
                    ayuda="Solo se muestran las agencias activas."
                  >
                    <select
                      id="usuario-agencia"
                      className={selectClassName}
                      {...ariaCampo('usuario-agencia', error('idAgencia'), 'Solo se muestran las agencias activas.')}
                      {...register('idAgencia')}
                    >
                      <option value="" disabled>
                        {agencias.isLoading ? 'Cargando agencias…' : 'Elige la agencia donde operará'}
                      </option>
                      {agenciasActivas.map((agencia) => (
                        <option key={agencia.idAgencia} value={agencia.idAgencia}>
                          {etiquetaAgencia(agencia)}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </div>
              </div>
            </section>
          </fieldset>

          {varias && principal && <fieldset disabled={pendiente} className="space-y-3">
            <label className="flex min-h-10 items-center gap-3">
              <input type="checkbox" checked={agregarMas} onChange={(e) => { setAgregarMas(e.target.checked); if (!e.target.checked) setAdicionales([]) }} />
              Desea agregar a mas agencias?
            </label>
            {agregarMas && <div className="space-y-2 rounded-xl border border-border p-4">
              <p className="text-sm text-muted-foreground">La primera agencia seleccionada sera la principal. Seleccione las agencias adicionales.</p>
              {agenciasActivas.filter((a) => a.idAgencia !== principal).map((a) => <label key={a.idAgencia} className="flex min-h-10 items-center gap-3"><input type="checkbox" checked={adicionales.includes(a.idAgencia)} onChange={(e) => setAdicionales(e.target.checked ? [...adicionales, a.idAgencia] : adicionales.filter((id) => id !== a.idAgencia))} />{etiquetaAgencia(a)}</label>)}
            </div>}
          </fieldset>}

          {creacion.isError && (
            <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {mensajeErrorCreacion(creacion.error)}
            </p>
          )}

          <DialogFooter className="-mx-6 -mb-6 rounded-b-3xl border-t border-border p-6 sm:-mx-8 sm:-mb-8 sm:px-8">
            <Button type="button" variant="outline" disabled={pendiente} onClick={cerrar} className="min-h-11 rounded-xl px-6">
              Cancelar
            </Button>
            <Button type="submit" disabled={pendiente} className="min-h-11 rounded-xl px-6 font-semibold">
              {pendiente ? <LoaderCircle className="animate-spin" /> : <MailPlus />}
              {pendiente ? 'Creando…' : 'Crear e invitar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
