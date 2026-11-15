import { useState, type FormEvent } from 'react'
import { LoaderCircle, Save } from 'lucide-react'

import { toApiError } from '@/shared/api'
import {
  Aviso,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/shared/ui'
import type { CatalogoAdministrable, RegistroCatalogo } from '@/features/catalogos/api/catalogos.contract'
import { Campo, inputClassName } from '@/features/catalogos/components/CampoCatalogo'
import { useActualizarRegistroCatalogo } from '@/features/catalogos/hooks/useCatalogos'
import { mensajeErrorCatalogo } from '@/features/catalogos/lib/mensajes'
import { aTexto, cambiosRegistro, mostrar } from '@/features/catalogos/lib/registro-form'

interface EditarRegistroDialogProps {
  catalogo: CatalogoAdministrable
  /** Fila a editar; null = cerrado */
  registro: RegistroCatalogo | null
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

/** Edición de una fila (solo ADMIN). Los campos de solo lectura se muestran sin control */
export function EditarRegistroDialog({ catalogo, registro, onCerrar, onGuardado }: EditarRegistroDialogProps) {
  return (
    <Dialog open={registro !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Editar · {catalogo.nombre}</DialogTitle>
          <DialogDescription>Los datos sin casilla de edición no cambian desde aquí.</DialogDescription>
        </DialogHeader>
        {registro && (
          <Formulario key={`${catalogo.clave}-${registro.id}`} catalogo={catalogo} registro={registro} onCancelar={onCerrar} onGuardado={onGuardado} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({
  catalogo,
  registro,
  onCancelar,
  onGuardado,
}: {
  catalogo: CatalogoAdministrable
  registro: RegistroCatalogo
  onCancelar: () => void
  onGuardado: (mensaje: string) => void
}) {
  const actualizar = useActualizarRegistroCatalogo()
  const [entradas, setEntradas] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(catalogo.campos.filter((c) => c.editable).map((c) => [c.nombre, aTexto(c, registro[c.nombre])])),
  )
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [sinCambios, setSinCambios] = useState(false)

  const guardar = (evento: FormEvent) => {
    evento.preventDefault()
    const resultado = cambiosRegistro(catalogo.campos, registro, entradas)
    if ('errores' in resultado) {
      setErrores(resultado.errores)
      return
    }
    setErrores({})
    if (Object.keys(resultado.body).length === 0) {
      setSinCambios(true)
      return
    }
    actualizar.mutate(
      { clave: catalogo.clave, id: registro.id, body: resultado.body },
      { onSuccess: () => onGuardado(`Guardamos los cambios en ${catalogo.nombre.toLowerCase()}.`) },
    )
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
      {catalogo.campos.map((campo) => {
        const id = `reg-${campo.nombre}`
        if (!campo.editable) {
          return (
            <div key={campo.nombre} className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-heading">{campo.etiqueta}</span>
              <span className="text-sm text-muted-foreground">{mostrar(campo, registro[campo.nombre])}</span>
            </div>
          )
        }
        if (campo.tipo === 'booleano') {
          return (
            <div key={campo.nombre} className="flex items-center gap-3">
              <Checkbox
                id={id}
                checked={entradas[campo.nombre] === true}
                onCheckedChange={(v) => setEntradas((e) => ({ ...e, [campo.nombre]: v === true }))}
              />
              <Label htmlFor={id} className="text-sm text-heading">
                {campo.etiqueta}
              </Label>
            </div>
          )
        }
        const ayuda = campo.tipo === 'porcentaje' ? 'En porcentaje: 16 = 16 %.' : campo.nulo ? 'Vacío: sin valor.' : undefined
        return (
          <Campo key={campo.nombre} id={id} label={campo.etiqueta} error={errores[campo.nombre]} ayuda={ayuda}>
            <Input
              id={id}
              type={campo.tipo === 'fecha' ? 'date' : 'text'}
              inputMode={campo.tipo === 'texto' || campo.tipo === 'fecha' ? undefined : 'decimal'}
              maxLength={campo.tipo === 'texto' ? (campo.maximo ?? undefined) : 20}
              autoComplete="off"
              className={inputClassName}
              aria-invalid={!!errores[campo.nombre]}
              aria-describedby={errores[campo.nombre] ? `${id}-error` : undefined}
              value={String(entradas[campo.nombre] ?? '')}
              onChange={(e) => {
                setSinCambios(false)
                setEntradas((actual) => ({ ...actual, [campo.nombre]: e.target.value }))
              }}
            />
          </Campo>
        )
      })}
      {sinCambios && <Aviso>No cambiaste ningún dato.</Aviso>}
      {actualizar.error && <Aviso tono="error">{mensajeErrorCatalogo(toApiError(actualizar.error))}</Aviso>}
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={actualizar.isPending} className="rounded-lg px-4 font-semibold">
          {actualizar.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
          Guardar
        </Button>
      </DialogFooter>
    </form>
  )
}
