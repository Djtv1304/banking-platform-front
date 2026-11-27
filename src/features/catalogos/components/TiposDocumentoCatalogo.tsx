import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toApiError } from '@/shared/api'
import { Aviso, AvisoRequiereAprobacion, Button, Input } from '@/shared/ui'
import { solicitarTipo, useTiposIdentidad, type TipoIdentidad } from '@/features/clientes/api/documentos-identidad'

const FLAGS = [
  ['aplicaNatural', 'Persona natural'], ['aplicaJuridico', 'Persona jurídica'],
  ['requierePais', 'Requiere país emisor'], ['requiereVencimiento', 'Requiere vencimiento'],
  ['digitoVerificadorBloquea', 'Rechaza dígito verificador incorrecto'], ['permitePrincipal', 'Permite usarlo como principal'], ['activo', 'Tipo activo'],
] as const

export function TiposDocumentoCatalogo({ crear, editar }: { crear: boolean; editar: boolean }) {
  const tipos = useTiposIdentidad()
  const cache = useQueryClient()
  const [seleccion, setSeleccion] = useState<TipoIdentidad | 'nuevo'>()
  const anterior = seleccion === 'nuevo' ? undefined : seleccion
  const [solicitud, setSolicitud] = useState<number>()
  const guardar = useMutation({
    mutationFn: (form: FormData) => solicitarTipo({
      codigo: anterior?.codigo ?? String(form.get('codigo')).trim().toUpperCase(),
      nombre: String(form.get('nombre')).trim(),
      algoritmo: form.get('algoritmo') as TipoIdentidad['algoritmo'],
      patronCaracteres: form.get('patron') as TipoIdentidad['patronCaracteres'],
      longitudMinima: Number(form.get('minimo')),
      longitudMaxima: Number(form.get('maximo')),
      aplicaNatural: form.has('aplicaNatural'), aplicaJuridico: form.has('aplicaJuridico'),
      digitoVerificadorBloquea: form.has('digitoVerificadorBloquea'),
      requierePais: form.has('requierePais'), requiereVencimiento: form.has('requiereVencimiento'),
      permitePrincipal: form.has('permitePrincipal'), activo: form.has('activo'),
      accionAlVencer: form.get('vencimiento') as TipoIdentidad['accionAlVencer'],
      motivo: String(form.get('motivo')).trim(), version: anterior?.version,
    }),
    onSuccess: async (resultado) => {
      setSeleccion(undefined)
      setSolicitud(resultado.idSolicitud)
      await cache.invalidateQueries({ queryKey: ['catalogos', 'tipos-documento'] })
    },
  })
  const elegir = (valor: TipoIdentidad | 'nuevo') => {
    guardar.reset()
    setSolicitud(undefined)
    setSeleccion(valor)
  }
  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    guardar.mutate(new FormData(evento.currentTarget))
  }
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Tipos de documento</h2>
      {crear && <Button variant="outline" onClick={() => elegir('nuevo')}>Nuevo tipo</Button>}
      {solicitud !== undefined && <AvisoRequiereAprobacion idSolicitud={solicitud} />}
      {tipos.isPending && <p role="status">Cargando tipos…</p>}
      {tipos.isError && <Aviso tono="error"><Button variant="outline" onClick={() => void tipos.refetch()}>Volver a cargar</Button></Aviso>}
      {tipos.data?.map((tipo) => (
        <div key={tipo.codigo} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
          <span>{tipo.nombre} ({tipo.codigo}) · {tipo.activo ? 'Activo' : 'Inactivo'}</span>
          {editar && <Button variant="outline" onClick={() => elegir(tipo)}>Editar</Button>}
        </div>
      ))}
      {seleccion && (
        <form key={anterior?.codigo ?? 'nuevo'} onSubmit={enviar} className="rounded-xl border border-border p-4">
          <fieldset disabled={guardar.isPending} className="grid gap-4 sm:grid-cols-2">
            <label>Código<Input name="codigo" required pattern="[A-Za-z0-9]+" maxLength={10} defaultValue={anterior?.codigo} readOnly={!!anterior} /></label>
            <label>Nombre<Input name="nombre" required maxLength={80} defaultValue={anterior?.nombre} /></label>
            <label>Algoritmo
              <select name="algoritmo" className="ml-2 rounded border" defaultValue={anterior?.algoritmo ?? 'NINGUNO'}>
                <option value="NINGUNO">Ninguno</option><option value="EC_CEDULA">Cédula ecuatoriana</option><option value="EC_RUC">RUC ecuatoriano</option>
              </select>
            </label>
            <label>Caracteres
              <select name="patron" className="ml-2 rounded border" defaultValue={anterior?.patronCaracteres ?? 'ALFANUMERICO'}>
                <option value="ALFANUMERICO">Letras y dígitos</option><option value="DIGITOS">Solo dígitos</option>
              </select>
            </label>
            <label>Longitud mínima<Input name="minimo" type="number" min={1} max={20} required defaultValue={anterior?.longitudMinima ?? 1} /></label>
            <label>Longitud máxima<Input name="maximo" type="number" min={1} max={20} required defaultValue={anterior?.longitudMaxima ?? 20} /></label>
            {FLAGS.map(([campo, etiqueta]) => (
              <label key={campo} className="flex items-center gap-2">
                <input type="checkbox" name={campo} defaultChecked={anterior?.[campo] ?? (['aplicaNatural', 'activo', 'digitoVerificadorBloquea'].includes(campo))} />{etiqueta}
              </label>
            ))}
            <label>Al vencer
              <select name="vencimiento" className="ml-2 rounded border" defaultValue={anterior?.accionAlVencer ?? 'Avisar'}>
                <option>Avisar</option><option>Suspender</option>
              </select>
            </label>
            <label>Motivo<Input name="motivo" required maxLength={300} /></label>
            {guardar.isError && <Aviso tono="error">{toApiError(guardar.error).message}</Aviso>}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">Enviar a aprobación</Button>
              <Button type="button" variant="outline" onClick={() => setSeleccion(undefined)}>Cancelar</Button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  )
}
