import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toApiError } from '@/shared/api'
import { useAuthStore } from '@/features/auth'
import { Aviso, AvisoRequiereAprobacion, Button, Cargando, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui'
import { consultarVigencias, programarConjunto } from '@/features/organizacion/api/programacion.api'
import { obtenerCupos } from '@/features/organizacion/api/productos.api'
import type { ClaseConjunto } from '@/features/organizacion/api/programacion.contract'
import { ProgramacionForm } from '@/features/organizacion/components/ProgramacionForm'
import type { ProductoAdmin, SubProductoAdmin } from '@/features/organizacion/api/productos.contract'
import {
  SeccionElegibilidad,
} from '@/features/organizacion/components/SeccionesSubProducto'
import { SeccionVinculos } from '@/features/organizacion/components/SeccionVinculos'

interface ParametrosSubProductoDialogProps {
  producto: ProductoAdmin
  /** Subproducto a parametrizar; null = cerrado */
  subproducto: SubProductoAdmin | null
  /** ASESOR lo ve en solo lectura */
  soloLectura: boolean
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}

const DESCRIPCION = {
  Credito: 'Tasas, comisiones, seguros y tablas de amortización de este subproducto.',
  Cuenta: 'Cupos por canal, restricciones, tasas de ahorro, comisiones y seguros.',
  Tarjeta: 'Cupos por canal, tasas de tarjeta, comisiones y seguros.',
} as const

/**
 * Parámetros de un subproducto por secciones, según el tipo de producto. Cada sección se guarda
 * por separado. Los objetos que se vinculan se crean en Catálogos.
 */
export function ParametrosSubProductoDialog({ producto, subproducto, soloLectura, onCerrar, onGuardado }: ParametrosSubProductoDialogProps) {
  return (
    <Dialog open={subproducto !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">
            Parámetros de {subproducto?.nombreSubProducto ?? 'subproducto'}
          </DialogTitle>
          <DialogDescription>{DESCRIPCION[producto.tipoProducto]}</DialogDescription>
        </DialogHeader>
        {subproducto && (
          <div key={subproducto.idSubProducto} className="flex flex-col gap-6">
            <DatosBorrador producto={producto} subproducto={subproducto} soloLectura={soloLectura} onCerrar={onCerrar} onGuardado={onGuardado} />
            <DialogFooter className="-mx-6 -mb-6 px-6">
              <Button type="button" variant="outline" size="lg" onClick={onCerrar} className="rounded-lg px-4">
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DatosBorrador({ producto, subproducto, soloLectura, onCerrar, onGuardado }: Omit<ParametrosSubProductoDialogProps, 'subproducto'> & { subproducto: SubProductoAdmin }) {
  const id = subproducto.idSubProducto, cliente = useQueryClient()
  const usuario = useAuthStore(s => s.user)
  const vigencias = useQuery({ queryKey: ['productos', 'vigencias', id], queryFn: ({ signal }) => consultarVigencias(id, signal) })
  const canales = useQuery({ queryKey: ['productos', 'cupos', id], queryFn: () => obtenerCupos(id), enabled: producto.tipoProducto !== 'Credito' })
  const [solicitud, setSolicitud] = useState<number | null>(null)
  const programar = useMutation({ mutationFn: ({ clase, datos }: { clase: ClaseConjunto; datos: Record<string, unknown> }) => programarConjunto(id, clase, datos), onSuccess: async r => { setSolicitud(r.idSolicitud); await Promise.all([cliente.invalidateQueries({ queryKey: ['productos'] }), cliente.invalidateQueries({ queryKey: ['aprobaciones'] })]) } })
  if (vigencias.isPending) return <Cargando texto="Cargando parametros del borrador..." />
  if (vigencias.isError) return <Aviso tono="error">{toApiError(vigencias.error).message}</Aviso>
  const pendiente = vigencias.data.solicitudes.some(s => s.estado === 'Pendiente' || s.estado === 'Aprobada')
  const bloqueado = soloLectura || pendiente || subproducto.estadoCatalogo !== 'Borrador'
  const clases: ClaseConjunto[] = producto.tipoProducto === 'Cuenta' ? ['condiciones', 'cupos', 'restricciones'] : producto.tipoProducto === 'Tarjeta' ? ['condiciones', 'cupos'] : ['condiciones']
  const nombres = { condiciones: 'Condiciones', cupos: 'Cupos por canal', restricciones: 'Restricciones' }
  return <>
    {solicitud && <AvisoRequiereAprobacion idSolicitud={solicitud} />}
    {pendiente && <Aviso>Este borrador tiene una solicitud pendiente. Espera su resolucion para continuar configurandolo.</Aviso>}
    <SeccionElegibilidad subproducto={subproducto} soloLectura={bloqueado} onGuardado={onGuardado} />
    {clases.map(clase => <details key={clase} className="rounded-2xl border border-border p-4"><summary className="cursor-pointer font-semibold">{nombres[clase]}</summary><div className="mt-4">
      {clase === 'cupos' && canales.isError ? <Aviso tono="error">{toApiError(canales.error).message}</Aviso> : clase === 'cupos' && canales.isPending ? <Cargando texto="Cargando canales..." /> : <fieldset disabled={bloqueado || programar.isPending || !usuario?.permisos.includes('prd-condicion')}>
        {programar.isError && <Aviso tono="error">{toApiError(programar.error).message}</Aviso>}
        <ProgramacionForm clase={clase} fecha={vigencias.data.fechaConsulta} vigencias={vigencias.data} canales={canales.data ?? []} ocupado={programar.isPending} onEnviar={datos => programar.mutate({ clase, datos })} onCerrar={onCerrar} />
      </fieldset>}
    </div></details>)}
    <SeccionVinculos producto={producto} destino={{ tipo: 'subproducto', id }} soloLectura={bloqueado} onGuardado={onGuardado} />
  </>
}

/** Lo que se vincula al producto aplica a todos sus subproductos */
export function VinculosProductoDialog({
  producto,
  abierto,
  soloLectura,
  onCerrar,
  onGuardado,
}: {
  producto: ProductoAdmin
  abierto: boolean
  soloLectura: boolean
  onCerrar: () => void
  onGuardado: (mensaje: string) => void
}) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Vínculos de {producto.nombreProducto}</DialogTitle>
          <DialogDescription>Aplican a todos sus subproductos; cada subproducto puede personalizarlos.</DialogDescription>
        </DialogHeader>
        {abierto && (
          <div className="flex flex-col gap-6">
            <SeccionVinculos
              producto={producto}
              destino={{ tipo: 'producto', id: producto.idProducto }}
              soloLectura={soloLectura}
              onGuardado={onGuardado}
            />
            <DialogFooter className="-mx-6 -mb-6 px-6">
              <Button type="button" variant="outline" size="lg" onClick={onCerrar} className="rounded-lg px-4">
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
