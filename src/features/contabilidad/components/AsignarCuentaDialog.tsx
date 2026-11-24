import { useMemo, useState } from 'react'
import { FolderPlus } from 'lucide-react'

import {
  Aviso,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import type { CuentaContable } from '@/features/contabilidad/api/contabilidad.contract'
import type { CambioAsignacion, ClaseCuenta } from '@/features/contabilidad/api/cuentas-producto.contract'
import { CampoCuenta, inputCuentaClassName } from '@/features/contabilidad/components/CampoCuenta'
import { NuevaSubcuentaDialog } from '@/features/contabilidad/components/NuevaSubcuentaDialog'
import type { ArbolCuentas } from '@/features/contabilidad/lib/arbol'
import { cuentasCandidatas, descripcionClase, manana, type Alcance } from '@/features/contabilidad/lib/cuentas-producto'

export interface OpcionAlcance {
  clave: string
  etiqueta: string
  alcance: Alcance
}

export interface Asignando {
  clase: ClaseCuenta
  opciones: OpcionAlcance[]
  inicial: string
}

interface Props {
  asignando: Asignando | null
  plan: readonly CuentaContable[]
  arbol: ArbolCuentas
  puedeCrearCuenta: boolean
  onAgregar: (cambio: CambioAsignacion, resumen: string) => void
  onCerrar: () => void
}

const selectClassName = 'w-full rounded-xl border-border bg-field px-3 text-base data-[size=default]:h-11'

/** E3-05 · Elegir la cuenta de un rol (o crearla bajo su cuenta base) y su alcance y vigencia */
export function AsignarCuentaDialog({ asignando, plan, arbol, puedeCrearCuenta, onAgregar, onCerrar }: Props) {
  return (
    <Dialog open={asignando !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="gap-5 p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">Asignar cuenta contable</DialogTitle>
          <DialogDescription>
            {asignando && `${descripcionClase(asignando.clase)} · bajo ${asignando.clase.cuentaBase} ${asignando.clase.nombreCuentaBase ?? ''}`}
          </DialogDescription>
        </DialogHeader>
        {asignando && (
          <Formulario
            key={`${asignando.clase.idClase}-${asignando.inicial}`}
            asignando={asignando}
            plan={plan}
            arbol={arbol}
            puedeCrearCuenta={puedeCrearCuenta}
            onAgregar={onAgregar}
            onCerrar={onCerrar}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function Formulario({ asignando, plan, arbol, puedeCrearCuenta, onAgregar, onCerrar }: Omit<Props, 'asignando'> & { asignando: Asignando }) {
  const { clase, opciones } = asignando
  const candidatas = useMemo(() => cuentasCandidatas(plan, clase.cuentaBase), [plan, clase.cuentaBase])
  const base = useMemo(() => plan.find((c) => c.codigoCuenta === clase.cuentaBase), [plan, clase.cuentaBase])
  const nodoBase = base ? arbol.porId.get(base.idCuentaContable) : undefined

  const [alcance, setAlcance] = useState(asignando.inicial)
  const [cuenta, setCuenta] = useState('')
  const [desde, setDesde] = useState(manana())
  const [creando, setCreando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const opcion = opciones.find((o) => o.clave === alcance)
  const esExcepcion = opcion?.alcance.nivel !== 'TIPO' && clase.nivel === 'TIPO'

  const agregar = (quitar: boolean) => {
    if (!opcion) return setError('Elige a qué se aplica la cuenta.')
    if (!quitar && !cuenta) return setError('Elige una cuenta.')
    if (!desde) return setError('Indica desde cuándo rige.')
    const elegida = candidatas.find((c) => String(c.idCuentaContable) === cuenta)
    onAgregar(
      {
        idClase: clase.idClase,
        idProducto: opcion.alcance.nivel === 'PRODUCTO' ? opcion.alcance.id : null,
        idSubProducto: opcion.alcance.nivel === 'SUBPRODUCTO' ? opcion.alcance.id : null,
        idCuentaContable: quitar ? null : Number(cuenta),
        vigenciaDesde: desde,
      },
      `${descripcionClase(clase)} · ${opcion.etiqueta}: ${quitar ? 'quitar la excepción' : `${elegida?.codigoCuenta} ${elegida?.nombreCuenta}`} desde ${desde}`,
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {aviso && <Aviso>{aviso}</Aviso>}
      {error && <Aviso tono="error">{error}</Aviso>}

      <CampoCuenta id="asignar-alcance" label="Se aplica a">
        <Select value={alcance} onValueChange={setAlcance}>
          <SelectTrigger id="asignar-alcance" className={selectClassName}>
            <SelectValue placeholder="Elige el alcance" />
          </SelectTrigger>
          <SelectContent>
            {opciones.map((o) => (
              <SelectItem key={o.clave} value={o.clave}>
                {o.etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CampoCuenta>

      <CampoCuenta
        id="asignar-cuenta"
        label="Cuenta"
        ayuda={candidatas.length === 0 ? `No hay cuentas del último nivel bajo ${clase.cuentaBase}: créala.` : undefined}
      >
        <Select value={cuenta} onValueChange={setCuenta}>
          <SelectTrigger id="asignar-cuenta" className={selectClassName}>
            <SelectValue placeholder="Elige la cuenta" />
          </SelectTrigger>
          <SelectContent>
            {candidatas.map((c) => (
              <SelectItem key={c.idCuentaContable} value={String(c.idCuentaContable)}>
                {c.codigoCuenta} · {c.nombreCuenta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CampoCuenta>

      {puedeCrearCuenta && nodoBase && (
        <Button type="button" variant="outline" className="w-fit" onClick={() => setCreando(true)}>
          <FolderPlus aria-hidden />
          Crear cuenta bajo {clase.cuentaBase}
        </Button>
      )}

      <CampoCuenta id="asignar-desde" label="Rige desde">
        <Input id="asignar-desde" type="date" min={manana()} value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCuentaClassName} />
      </CampoCuenta>

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCerrar}>
          Cancelar
        </Button>
        {esExcepcion && (
          <Button type="button" variant="outline" onClick={() => agregar(true)}>
            Quitar excepción
          </Button>
        )}
        <Button type="button" onClick={() => agregar(false)}>
          Agregar a la solicitud
        </Button>
      </DialogFooter>

      {creando && nodoBase && (
        <NuevaSubcuentaDialog
          padre={nodoBase}
          onCerrar={() => setCreando(false)}
          onHecho={(mensaje) => {
            setCreando(false)
            setAviso(`${mensaje} Cuando exista, elígela en la lista.`)
          }}
        />
      )}
    </div>
  )
}
