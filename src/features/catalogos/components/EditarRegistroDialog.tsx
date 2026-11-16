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
import type { CampoCatalogo, CatalogoAdministrable, RegistroCatalogo } from '@/features/catalogos/api/catalogos.contract'
import { Campo, inputClassName } from '@/features/catalogos/components/CampoCatalogo'
import { useActualizarRegistroCatalogo, useCrearRegistroCatalogo } from '@/features/catalogos/hooks/useCatalogos'
import { mensajeErrorCatalogo } from '@/features/catalogos/lib/mensajes'
import { altaRegistro, aTexto, cambiosRegistro, mostrar } from '@/features/catalogos/lib/registro-form'

interface EditarRegistroDialogProps {
  catalogo: CatalogoAdministrable
  /** Fila a editar; null = cerrado */
  registro: RegistroCatalogo | null
  /** alta: registro nuevo con `camposAlta` */
  modo?: 'edicion' | 'alta'
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

/** Alta o edición de una fila (solo ADMIN). Los campos de solo lectura se muestran sin control */
export function EditarRegistroDialog({ catalogo, registro, modo = 'edicion', onCerrar, onGuardado }: EditarRegistroDialogProps) {
  const alta = modo === 'alta'
  return (
    <Dialog open={registro !== null} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">
            {alta ? 'Nuevo' : 'Editar'} · {catalogo.nombre}
          </DialogTitle>
          <DialogDescription>
            {alta ? 'Los códigos se guardan en mayúsculas; un código repetido se rechaza.' : 'Los datos sin casilla de edición no cambian desde aquí.'}
          </DialogDescription>
        </DialogHeader>
        {registro && (
          <Formulario
            key={`${catalogo.clave}-${registro.id || 'nuevo'}`}
            catalogo={catalogo}
            registro={registro}
            alta={alta}
            onCancelar={onCerrar}
            onGuardado={onGuardado}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({
  catalogo,
  registro,
  alta,
  onCancelar,
  onGuardado,
}: {
  catalogo: CatalogoAdministrable
  registro: RegistroCatalogo
  alta: boolean
  onCancelar: () => void
  onGuardado: (mensaje: string) => void
}) {
  const campos: readonly CampoCatalogo[] = alta ? (catalogo.camposAlta ?? []) : catalogo.campos
  const actualizar = useActualizarRegistroCatalogo()
  const crear = useCrearRegistroCatalogo()
  const mutacion = alta ? crear : actualizar
  const [entradas, setEntradas] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(campos.filter((c) => c.editable).map((c) => [c.nombre, aTexto(c, registro[c.nombre])])),
  )
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [sinCambios, setSinCambios] = useState(false)
  const nombre = catalogo.nombre.toLowerCase()

  const guardar = (evento: FormEvent) => {
    evento.preventDefault()
    const resultado = alta ? altaRegistro(campos, entradas) : cambiosRegistro(campos, registro, entradas)
    if ('errores' in resultado) {
      setErrores(resultado.errores)
      return
    }
    setErrores({})
    if (alta) {
      crear.mutate({ clave: catalogo.clave, body: resultado.body }, { onSuccess: () => onGuardado(`Agregamos el registro en ${nombre}.`) })
      return
    }
    if (Object.keys(resultado.body).length === 0) {
      setSinCambios(true)
      return
    }
    actualizar.mutate(
      { clave: catalogo.clave, id: registro.id, body: resultado.body },
      { onSuccess: () => onGuardado(`Guardamos los cambios en ${nombre}.`) },
    )
  }

  const cambiar = (nombreCampo: string, valor: string | boolean) => {
    setSinCambios(false)
    setEntradas((actual) => ({ ...actual, [nombreCampo]: valor }))
  }

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
      {campos.map((campo) => {
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
              <Checkbox id={id} checked={entradas[campo.nombre] === true} onCheckedChange={(v) => cambiar(campo.nombre, v === true)} />
              <Label htmlFor={id} className="text-sm text-heading">
                {campo.etiqueta}
              </Label>
            </div>
          )
        }
        const error = errores[campo.nombre]
        const a11y = { 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-error` : undefined }
        if (campo.tipo === 'opcion') {
          return (
            <Campo key={campo.nombre} id={id} label={campo.etiqueta} error={error}>
              <select
                id={id}
                className={`${inputClassName} w-full border`}
                value={String(entradas[campo.nombre] ?? '')}
                onChange={(e) => cambiar(campo.nombre, e.target.value)}
                {...a11y}
              >
                <option value="">Elige…</option>
                {(campo.opciones ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Campo>
          )
        }
        const ayuda = campo.tipo === 'porcentaje' ? 'En porcentaje: 16 = 16 %.' : campo.nulo ? 'Vacío: sin valor.' : undefined
        return (
          <Campo key={campo.nombre} id={id} label={campo.etiqueta} error={error} ayuda={ayuda}>
            <Input
              id={id}
              type={campo.tipo === 'fecha' ? 'date' : 'text'}
              inputMode={campo.tipo === 'texto' || campo.tipo === 'fecha' ? undefined : 'decimal'}
              maxLength={campo.tipo === 'texto' ? (campo.maximo ?? undefined) : 20}
              autoComplete="off"
              className={inputClassName}
              value={String(entradas[campo.nombre] ?? '')}
              onChange={(e) => cambiar(campo.nombre, e.target.value)}
              {...a11y}
            />
          </Campo>
        )
      })}
      {sinCambios && <Aviso>No cambiaste ningún dato.</Aviso>}
      {mutacion.error && <Aviso tono="error">{mensajeErrorCatalogo(toApiError(mutacion.error))}</Aviso>}
      <DialogFooter className="-mx-6 -mb-6 px-6">
        <Button type="button" variant="outline" size="lg" onClick={onCancelar} className="rounded-lg px-4">
          Cancelar
        </Button>
        <Button type="submit" size="lg" disabled={mutacion.isPending} className="rounded-lg px-4 font-semibold">
          {mutacion.isPending ? <LoaderCircle className="animate-spin" /> : <Save />}
          {alta ? 'Crear' : 'Guardar'}
        </Button>
      </DialogFooter>
    </form>
  )
}
