import { useState } from 'react'

import type { ImportacionCatalogo } from '@/features/contabilidad/api/importacion-catalogo.api'
import { Button } from '@/shared/ui'

type Fila = ImportacionCatalogo['revision'][number]
const grupos = [
  { tipo: 'Nueva', etiqueta: 'Nueva', titulo: 'Cuentas nuevas', campo: 'FilasNuevas' },
  { tipo: 'Cambiada', etiqueta: 'Modificada', titulo: 'Cuentas modificadas', campo: 'FilasCambiadas' },
  { tipo: 'Igual', etiqueta: 'Sin cambios', titulo: 'Cuentas sin cambios', campo: 'FilasIguales' },
  { tipo: 'Error', etiqueta: 'Error bloqueante', titulo: 'Filas con errores', campo: 'FilasError' },
] as const

const motivos: Readonly<Record<string, string>> = {
  CODIGO_INVALIDO: 'El código debe tener 1, 2, 4 o 6 dígitos.',
  CODIGO_DUPLICADO: 'El código aparece más de una vez en el CSV.',
  CODIGO_NO_CORRESPONDE_AL_PADRE: 'La cuenta superior no existe o no corresponde al código. En cuentas raíz, deja ese campo vacío.',
  DATOS_INVALIDOS: 'Revisa el nombre de la cuenta y usa DEUDORA o ACREEDORA como naturaleza.',
  NATURALEZA_EN_USO: 'La naturaleza no se puede cambiar porque la cuenta tiene saldo, movimientos o cuentas hijas.',
  RECLASIFICACION_REQUERIDA: 'La cuenta imputable tiene saldo o movimientos y requiere reclasificación.',
}

function observaciones(fila: Fila) {
  if (fila.resultado === 'Error') {
    const codigo = fila.codigoError
    return codigo && Object.hasOwn(motivos, codigo) ? motivos[codigo] : 'El servidor rechazó esta fila. Revisa sus valores en el CSV.'
  }
  if (fila.resultado === 'Igual') return 'Coincide con el plan actual.'
  const padre = fila.CodigoCuentaSuperior || 'Sin cuenta superior'
  if (fila.resultado === 'Nueva') return `${padre} · ${fila.Naturaleza}`
  const anterior = fila.anterior
  if (!anterior) return 'Revisa los datos propuestos para la cuenta.'
  const pares = [
    ['Nombre', anterior.nombre, fila.NombreCuenta],
    ['Cuenta superior', anterior.padre || 'Sin cuenta superior', padre],
    ['Naturaleza', anterior.naturaleza, fila.Naturaleza],
    ['Catálogo regulatorio', anterior.regulador ? 'Sí' : 'No', 'Sí'],
    ['Imputable', anterior.imputable ? 'Sí' : 'No', 'No'],
  ]
  return (
    <dl className="grid gap-2">
      {pares.filter(([, previo, propuesto]) => previo !== propuesto).map(([campo, previo, propuesto]) => (
        <div key={campo}>
          <dt className="font-medium">{campo}</dt>
          <dd className="text-muted-foreground">Anterior: {previo}</dd>
          <dd>Propuesto: {propuesto}</dd>
        </div>
      ))}
    </dl>
  )
}

const FILAS_POR_PAGINA = 25

export function RevisionCatalogo({ importacion }: { importacion: ImportacionCatalogo }) {
  const [filtro, setFiltro] = useState<Fila['resultado'] | null>(importacion.FilasError ? 'Error' : null)
  const [pagina, setPagina] = useState(0)
  const filas = filtro ? importacion.revision.filter((fila) => fila.resultado === filtro) : importacion.revision
  const inicio = pagina * FILAS_POR_PAGINA
  const fin = Math.min(inicio + FILAS_POR_PAGINA, filas.length)

  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar filas de la revisión">
        <Button variant={filtro === null ? 'default' : 'outline'} aria-pressed={filtro === null} onClick={() => { setFiltro(null); setPagina(0) }}>
          Todas ({importacion.revision.length})
        </Button>
        {grupos.map(({ tipo, titulo, campo }) => (
          <Button key={tipo} variant={filtro === tipo ? 'default' : 'outline'} aria-pressed={filtro === tipo}
            onClick={() => { setFiltro(tipo); setPagina(0) }}>
            {titulo} ({importacion[campo]})
          </Button>
        ))}
      </div>
      {filas.length ? (
        <div className="overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label="Detalle de la revisión">
          <table className="w-full min-w-[36rem] text-left text-sm [&_td]:p-3 [&_td]:align-top [&_th]:p-3">
            <thead className="bg-field">
              <tr><th scope="col">Fila</th><th scope="col">Código</th><th scope="col">Nombre</th><th scope="col">Tipo de cambio</th><th scope="col">Observaciones</th></tr>
            </thead>
            <tbody>
              {filas.slice(inicio, fin).map((fila) => (
                <tr key={fila.numeroFila} className="border-t border-border">
                  <td>{fila.numeroFila}</td>
                  <td className="break-all font-mono">{fila.CodigoCuenta}</td>
                  <td className="min-w-32 break-words">{fila.NombreCuenta}</td>
                  <td className={fila.resultado === 'Error' ? 'font-medium text-destructive' : 'font-medium'}>
                    {grupos.find(({ tipo }) => tipo === fila.resultado)?.etiqueta}
                  </td>
                  <td className="min-w-48 break-words">{observaciones(fila)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-sm text-muted-foreground">Esta categoría no tiene filas.</p>}
      {filas.length > FILAS_POR_PAGINA && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">Filas {inicio + 1} a {fin} de {filas.length}</p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={pagina === 0} onClick={() => setPagina(pagina - 1)}>Anterior</Button>
            <Button variant="outline" disabled={fin === filas.length} onClick={() => setPagina(pagina + 1)}>Siguiente</Button>
          </div>
        </div>
      )}
    </>
  )
}
