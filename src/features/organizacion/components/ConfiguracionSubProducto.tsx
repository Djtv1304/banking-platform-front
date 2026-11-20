import { useState } from 'react'
import { Link, useParams } from 'react-router'

import { hasPermission, PERMISOS, usePermisos, usePuedeFuncion } from '@/features/auth'
import { toApiError } from '@/shared/api'
import { Aviso, Cargando } from '@/shared/ui'
import { useFichaSubProducto } from '@/features/organizacion/hooks/useProductosAdmin'
import { PestanasSubProducto } from '@/features/organizacion/components/PestanasSubProducto'
import { SeccionVinculos } from '@/features/organizacion/components/SeccionVinculos'
import { SeccionElegibilidad } from '@/features/organizacion/components/SeccionesSubProducto'

/** Recupera los formularios existentes sin sustituir las vigencias E3-03 ni la numeracion E3-04. */
export function ConfiguracionSubProducto() {
  const id = Number(useParams().idSubProducto)
  const ficha = useFichaSubProducto(id)
  const permiso = hasPermission(usePermisos(), PERMISOS.productosEditar)
  const puedeVincular = usePuedeFuncion('productos.configurar', permiso)
  const puedeEditar = usePuedeFuncion('productos.editar', permiso)
  const [mensaje, setMensaje] = useState('')

  if (!Number.isSafeInteger(id) || id < 1) return <Aviso tono="error">El identificador del subproducto no es valido.</Aviso>
  if (ficha.isPending) return <Cargando texto="Cargando configuracion del subproducto..." />
  if (ficha.isError) return <Aviso tono="error">{toApiError(ficha.error).message}</Aviso>

  const { producto, subproducto } = ficha.data
  const soloLectura = !puedeVincular || subproducto.estadoCatalogo === 'Retirado'
  return <div className="mx-auto flex min-w-0 w-full max-w-6xl flex-col gap-6">
    <Link className="text-primary underline" to={`/productos/${producto.idProducto}`}>Volver al producto</Link>
    <header><p className="text-sm text-muted-foreground">{producto.nombreProducto}</p><h1 className="text-3xl font-bold text-heading">{subproducto.nombreSubProducto}</h1></header>
    <PestanasSubProducto id={id} tipo={producto.tipoProducto} activa="configuracion" />
    {mensaje && <Aviso>{mensaje}</Aviso>}
    {soloLectura && <Aviso>Solo tiene permisos de lectura.</Aviso>}
    <section role="tabpanel" aria-label="Tasas y cargos" className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-6 [&>section]:border-0 [&>section]:p-0 [&_fieldset>ul]:grid [&_fieldset>ul]:gap-3 md:[&_fieldset>ul]:grid-cols-2">
      <SeccionVinculos key={id} producto={producto} destino={{ tipo: 'subproducto', id }} soloLectura={soloLectura} onGuardado={setMensaje} />
    </section>
    <section aria-label="Elegibilidad del modelo" className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-6 [&>section]:border-0 [&>section]:p-0">
      {subproducto.estadoCatalogo !== 'Borrador' && <p className="mb-4 text-sm text-muted-foreground">Las edades y los datos de elegibilidad solo se editan en Borrador.</p>}
      <SeccionElegibilidad key={id} subproducto={subproducto} soloLectura={!puedeEditar || subproducto.estadoCatalogo !== 'Borrador'} onGuardado={setMensaje} />
    </section>
  </div>
}
