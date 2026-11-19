import { useEffect, useId, useState } from 'react'
import { LoaderCircle, Search, X } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { cn } from '@/shared/lib'
import { Input } from '@/shared/ui'
import { formatRol, useAuthStore } from '@/features/auth'
import { nombreCompleto, useUsuario, useUsuarios, type UsuarioResumen } from '@/features/usuarios'
import { campoClassName } from '@/features/boveda/lib/campos'

interface SelectorUsuarioProps {
  id: string
  value: number | null
  onChange: (idUsuario: number | null) => void
  onBlur?: () => void
  error?: string
  disabled?: boolean
}

const MIN_BUSQUEDA = 2
const RESULTADOS = 6

/**
 * Busca usuarios internos activos por nombre, username o correo (AUT-05) solo cuando se escribe: no
 * carga la lista al abrir. La persona que opera no aparece (una operación no se autoriza ni se
 * atestigua a sí misma). Si el rol no puede consultar usuarios (403), se pide el número de usuario.
 */
export function SelectorUsuario({ id, value, onChange, onBlur, error, disabled }: SelectorUsuarioProps) {
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [elegido, setElegido] = useState<UsuarioResumen | null>(null)
  const emailPropio = useAuthStore((state) => state.user?.email?.trim().toLowerCase())
  const listaId = useId()

  // Espera a que se deje de escribir: una consulta por búsqueda, no por tecla
  useEffect(() => {
    const espera = setTimeout(() => setBusqueda(texto.trim()), 300)
    return () => clearTimeout(espera)
  }, [texto])

  const habilitado = value === null && busqueda.length >= MIN_BUSQUEDA
  const resultados = useUsuarios({ q: busqueda, page: '1', pageSize: String(RESULTADOS + 2) }, habilitado)
  // Si se eligió en otra sesión del formulario (o por número), se muestra quién es desde la caché o AUT-07
  const detalle = useUsuario(value, value !== null && elegido?.idUsuario !== value)
  const sinPermiso = toApiError(resultados.error ?? detalle.error).status === 403

  if (sinPermiso) return <PorNumero id={id} value={value} onChange={onChange} onBlur={onBlur} error={error} disabled={disabled} />

  if (value !== null) {
    const usuario = elegido?.idUsuario === value ? elegido : detalle.data
    return (
      <div className="flex min-h-[52px] items-center gap-3 rounded-xl border border-border bg-field px-4 py-2">
        <div className="flex min-w-0 flex-1 flex-col">
          {usuario ? (
            <>
              <span className="truncate font-semibold text-heading">{nombreCompleto(usuario)}</span>
              <span className="truncate text-sm text-muted-foreground">
                {usuario.username}
                {usuario.rol ? ` · ${formatRol(usuario.rol)}` : ''}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Usuario elegido</span>
          )}
        </div>
        <button
          type="button"
          id={id}
          disabled={disabled}
          onClick={() => {
            setElegido(null)
            onChange(null)
          }}
          className="rounded-lg px-2 py-1 text-sm font-semibold text-link outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          Cambiar
        </button>
      </div>
    )
  }

  const activos = (resultados.data?.items ?? [])
    .filter((usuario) => usuario.estado.trim().toLowerCase().startsWith('activ'))
    .filter((usuario) => usuario.email.trim().toLowerCase() !== emailPropio)
    .slice(0, RESULTADOS)
  const buscando = habilitado && resultados.isFetching
  const mostrarLista = habilitado && !resultados.isPending

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="search"
          autoComplete="off"
          maxLength={100}
          placeholder="Busca por nombre, username o correo"
          value={texto}
          disabled={disabled}
          onChange={(event) => setTexto(event.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-controls={mostrarLista ? listaId : undefined}
          className={cn(campoClassName, 'pr-11 pl-12')}
        />
        {buscando && <LoaderCircle aria-hidden className="absolute top-1/2 right-4 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {mostrarLista && (
        <div id={listaId} aria-live="polite">
          {resultados.isError ? (
            <p className="px-1 text-sm text-destructive">No pudimos buscar usuarios. Inténtalo de nuevo.</p>
          ) : activos.length === 0 ? (
            <p className="px-1 text-sm text-muted-foreground">Ningún usuario activo coincide con «{busqueda}».</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {activos.map((usuario) => (
                <li key={usuario.idUsuario}>
                  <button
                    type="button"
                    onClick={() => {
                      setElegido(usuario)
                      setTexto('')
                      onChange(usuario.idUsuario)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left outline-none hover:bg-muted/60 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium text-heading">{nombreCompleto(usuario)}</span>
                      <span className="truncate text-sm text-muted-foreground">{usuario.username}</span>
                    </span>
                    {usuario.rol && <span className="shrink-0 text-sm text-muted-foreground">{formatRol(usuario.rol)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

/** Sin acceso a la lista de usuarios: se escribe el número de usuario interno */
function PorNumero({ id, value, onChange, onBlur, error, disabled }: SelectorUsuarioProps) {
  const [texto, setTexto] = useState(value === null ? '' : String(value))
  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          placeholder="N.º de usuario"
          value={texto}
          disabled={disabled}
          onChange={(event) => {
            const limpio = event.target.value.replace(/\D/g, '')
            setTexto(limpio)
            const numero = Number(limpio)
            onChange(limpio && numero > 0 && numero <= 2_147_483_647 ? numero : null)
          }}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : `${id}-numero`}
          className={campoClassName}
        />
        {texto && (
          <button
            type="button"
            aria-label="Borrar"
            onClick={() => {
              setTexto('')
              onChange(null)
            }}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <p id={`${id}-numero`} className="px-1 text-xs text-muted-foreground">
        Tu rol no puede buscar usuarios: escribe su número de usuario interno.
      </p>
    </div>
  )
}
