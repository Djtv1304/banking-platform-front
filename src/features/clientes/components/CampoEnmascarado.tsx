import { ShieldCheck } from 'lucide-react'

import { Button, Input, Label } from '@/shared/ui'
import type { CampoRevelable } from '@/features/clientes/api/revelacion'
import { usePuedeVerSensible, useRevelacion, type ControlRevelacion } from '@/features/clientes/hooks/useRevelacion'
import { codigoValido, OCULTAR_TRAS_MS } from '@/features/clientes/lib/revelacion'

type CampoUnico = Exclude<CampoRevelable, 'correosSecundarios'>

interface CampoEnmascaradoProps {
  idCliente: number
  campo: CampoUnico
  /** Valor enmascarado tal como lo envía el backend (`******4065`) */
  valor: string
  /** Nombre del dato para los textos accesibles («documento», «correo»…) */
  etiqueta: string
}

/**
 * E5-05 · Muestra el dato enmascarado y, con `clientes.verSensible`, permite ver el valor completo
 * tras verificar un código MFA. El valor completo vive solo en el estado de este componente.
 */
export function CampoEnmascarado({ idCliente, campo, valor, etiqueta }: CampoEnmascaradoProps) {
  const puede = usePuedeVerSensible()
  const control = useRevelacion(idCliente, [campo])
  const { fase, datos } = control.estado
  const completo = fase === 'visible' ? datos?.[campo] ?? 'Sin dato registrado' : null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all tabular-nums">{completo ?? valor}</span>
        {puede && fase === 'cerrado' && (
          <Button type="button" size="sm" variant="outline" onClick={control.abrir} aria-label={`Mostrar valor completo de ${etiqueta}`}>
            Mostrar valor completo
          </Button>
        )}
        {fase === 'visible' && (
          <Button type="button" size="sm" variant="outline" onClick={control.ocultar} aria-label={`Ocultar ${etiqueta}`}>
            Ocultar
          </Button>
        )}
      </div>
      {fase === 'visible' && <AvisoOcultamiento />}
      <PanelRevelacion id={`revelar-${campo}-${idCliente}`} etiqueta={etiqueta} control={control} />
    </div>
  )
}

export function AvisoOcultamiento() {
  return <p className="text-xs font-normal text-muted-foreground">Se ocultará automáticamente en {OCULTAR_TRAS_MS / 1000} segundos.</p>
}

/** Panel en línea (sin portal) para pedir el código de la app de autenticación */
export function PanelRevelacion({ id, etiqueta, control }: { id: string; etiqueta: string; control: ControlRevelacion }) {
  const { fase, idDesafio, codigo, error } = control.estado
  if (fase === 'cerrado' || fase === 'visible') return null
  const verificando = fase === 'verificando'

  return (
    <div role="group" aria-label={`Verificación para ver ${etiqueta}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-muted p-4 text-sm font-normal">
      <p className="flex items-start gap-2 text-foreground">
        <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
        Para ver {etiqueta} completo escribe el código de 6 dígitos de tu app de autenticación. La consulta queda registrada a tu nombre.
      </p>
      {fase === 'pidiendo' && <p role="status" className="text-muted-foreground">Preparando la verificación…</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {(fase === 'codigo' || verificando) && idDesafio && (
        <form className="flex flex-col gap-2" noValidate onSubmit={(event) => { event.preventDefault(); control.enviar() }}>
          <Label htmlFor={id}>Código de verificación</Label>
          <Input id={id} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} className="max-w-40 tabular-nums"
            value={codigo} disabled={verificando} onChange={(event) => control.escribirCodigo(event.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={verificando || !codigoValido(codigo)}>{verificando ? 'Verificando…' : 'Ver valor completo'}</Button>
            <Button type="button" size="sm" variant="outline" onClick={control.ocultar}>Cancelar</Button>
          </div>
        </form>
      )}
      {fase === 'codigo' && !idDesafio && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={control.abrir}>Pedir un código nuevo</Button>
          <Button type="button" size="sm" variant="outline" onClick={control.ocultar}>Cancelar</Button>
        </div>
      )}
    </div>
  )
}
