import { useState, type FormEvent, type ReactNode } from 'react'
import { LoaderCircle, Save } from 'lucide-react'

import { toApiError } from '@/shared/api'
import { Aviso, Button, Input } from '@/shared/ui'
import type { SubProductoAdmin } from '@/features/organizacion/api/productos.contract'
import { CampoAgencia as Campo, inputClassName } from '@/features/organizacion/components/CampoAgencia'
import {
  useActualizarSubProducto,
} from '@/features/organizacion/hooks/useProductosAdmin'
import { mensajeErrorProducto } from '@/features/organizacion/lib/producto-form'

interface SeccionProps {
  subproducto: SubProductoAdmin
  soloLectura: boolean
  onGuardado: (mensaje: string) => void
}

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border p-4">
      <div>
        <h3 className="text-base font-semibold text-heading">{titulo}</h3>
        <p className="text-sm text-muted-foreground">{descripcion}</p>
      </div>
      {children}
    </section>
  )
}

function Guardar({ ocupado }: { ocupado: boolean }) {
  return (
    <div className="flex justify-end">
      <Button type="submit" disabled={ocupado} className="rounded-lg px-4 font-semibold">
        {ocupado ? <LoaderCircle className="animate-spin" /> : <Save />}
        Guardar sección
      </Button>
    </div>
  )
}

export function SeccionElegibilidad({ subproducto, soloLectura, onGuardado }: SeccionProps) {
  const actualizar = useActualizarSubProducto()
  const texto = (v: number | null | undefined) => (v == null ? '' : String(v))
  const [minima, setMinima] = useState(() => texto(subproducto.edadMinima))
  const [maxima, setMaxima] = useState(() => texto(subproducto.edadMaxima))
  const [nombre, setNombre] = useState(subproducto.nombreSubProducto)
  const [tipoCliente, setTipoCliente] = useState(subproducto.tipoClientePermitido ?? 'Ambos')
  const [tutor, setTutor] = useState(subproducto.requiereTutor ?? false)
  const [requerido, setRequerido] = useState(() => texto(subproducto.idSubProductoRequerido))
  const [maximo, setMaximo] = useState(() => texto(subproducto.maximoPorCliente))
  const [error, setError] = useState<string | null>(null)

  const leer = (v: string) => (v.trim() === '' ? null : /^\d{1,3}$/.test(v.trim()) && Number(v) <= 120 ? Number(v) : undefined)

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const edadMinima = leer(minima)
    const edadMaxima = leer(maxima)
    if (edadMinima === undefined || edadMaxima === undefined) return setError('Usa años enteros entre 0 y 120.')
    if (edadMinima !== null && edadMaxima !== null && edadMaxima < edadMinima) {
      return setError('La edad máxima no puede ser menor que la mínima.')
    }
    if ([[requerido, 2147483647], [maximo, 32767]].some(([valor, limite]) => String(valor) !== '' && (!/^\d+$/.test(String(valor)) || Number(valor) < 1 || Number(valor) > Number(limite)))) return setError('Usa identificadores y cantidades enteras positivas.')
    setError(null)
    actualizar.mutate(
      { idSubProducto: subproducto.idSubProducto, body: { nombreSubProducto: nombre.trim(), edadMinima, edadMaxima, tipoClientePermitido: tipoCliente, requiereTutor: tutor, idSubProductoRequerido: requerido ? Number(requerido) : null, maximoPorCliente: maximo ? Number(maximo) : null } },
      { onSuccess: () => onGuardado(`Guardamos la elegibilidad de ${subproducto.codigoSubProducto}.`) },
    )
  }

  const campo = (id: string, etiqueta: string, valor: string, cambiar: (v: string) => void, ayuda: string) => (
    <Campo id={id} label={etiqueta} ayuda={ayuda}>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        maxLength={3}
        disabled={soloLectura}
        className={inputClassName}
        value={valor}
        onChange={(e) => cambiar(e.target.value)}
      />
    </Campo>
  )

  return (
    <Seccion
      titulo="Elegibilidad"
      descripcion="Edad del cliente para ofrecerle este subproducto. Vacío = sin límite. Rige la edad mínima más alta entre esta, la de la red (tarjetas) y la política de crédito EDAD_MINIMA (créditos); la ficha muestra la que rige."
    >
      <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo id="eleg-nombre" label="Nombre"><Input id="eleg-nombre" value={nombre} minLength={3} maxLength={100} onChange={(e) => setNombre(e.target.value)} disabled={soloLectura} /></Campo>
          <Campo id="eleg-tipo" label="Tipo de cliente"><select id="eleg-tipo" className={inputClassName} value={tipoCliente} onChange={(e) => setTipoCliente(e.target.value as typeof tipoCliente)} disabled={soloLectura}><option value="Ambos">Ambos</option><option value="Natural">Natural</option><option value="Juridico">Jurídico</option></select></Campo>
          <Campo id="eleg-requerido" label="ID del subproducto requerido"><Input id="eleg-requerido" type="number" min={1} step={1} value={requerido} onChange={(e) => setRequerido(e.target.value)} disabled={soloLectura} /></Campo>
          <Campo id="eleg-maximo" label="Máximo por cliente"><Input id="eleg-maximo" type="number" min={1} max={32767} step={1} value={maximo} onChange={(e) => setMaximo(e.target.value)} disabled={soloLectura} /></Campo>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={tutor} onChange={(e) => setTutor(e.target.checked)} disabled={soloLectura} />Requiere tutor</label>
          {campo('eleg-min', 'Edad mínima (años)', minima, setMinima, 'Ej.: 18.')}
          {campo('eleg-max', 'Edad máxima (años)', maxima, setMaxima, 'Menores: 17.')}
        </div>
        {error && <Aviso tono="error">{error}</Aviso>}
        {actualizar.error && <Aviso tono="error">{mensajeErrorProducto(toApiError(actualizar.error))}</Aviso>}
        {!soloLectura && <Guardar ocupado={actualizar.isPending} />}
      </form>
    </Seccion>
  )
}
