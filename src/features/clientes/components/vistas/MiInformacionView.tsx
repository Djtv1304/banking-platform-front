import { Info } from 'lucide-react'

import { useMiPerfil, useMisDocumentos } from '@/features/clientes/hooks/useClientes'
import { formatearFecha } from '@/features/clientes/lib/documentos'
import { DocumentosCliente } from '@/features/clientes/components/documentos/DocumentosCliente'
import { DatosLista } from '@/features/clientes/components/DatosLista'

const ETIQUETA_DOCUMENTO = { CEDULA: 'Cédula', RUC: 'RUC', PASAPORTE: 'Pasaporte' } as const

/** Vista del cliente: solo sus datos no sensibles (ya enmascarados por el backend) y sus documentos */
export function MiInformacionView() {
  const perfil = useMiPerfil()
  const documentos = useMisDocumentos()

  const datos = perfil.data && [
    { label: 'Nombre', valor: perfil.data.nombre },
    { label: 'Tipo de cliente', valor: perfil.data.tipoCliente === 'NATURAL' ? 'Persona natural' : 'Persona jurídica' },
    { label: ETIQUETA_DOCUMENTO[perfil.data.tipoDocumento], valor: perfil.data.identificacionEnmascarada },
    { label: 'Correo electrónico', valor: perfil.data.email },
    { label: 'Celular', valor: perfil.data.telefonoCelularEnmascarado },
    { label: 'Ciudad', valor: perfil.data.ciudad },
    { label: 'Cliente desde', valor: formatearFecha(perfil.data.fechaRegistro) },
  ]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div>
        <h1 className="text-[40px] leading-tight font-bold tracking-tight text-heading">Mi información</h1>
        <p className="mt-2 text-base text-muted-foreground">Consulta tus datos y los documentos de tus productos.</p>
      </div>

      <section aria-labelledby="datos-titulo" className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 id="datos-titulo" className="text-xl font-semibold text-heading">
          Datos básicos
        </h2>

        <div className="mt-5">
          {perfil.isError ? (
            <p className="text-sm text-destructive">No pudimos cargar tus datos.</p>
          ) : (
            <DatosLista datos={datos} />
          )}
        </div>

        <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          Por tu seguridad ocultamos parte de tu identificación y tu celular. Para actualizar tus datos, acércate a
          cualquiera de nuestras agencias.
        </p>
      </section>

      <DocumentosCliente
        documentos={documentos.data}
        isPending={documentos.isPending}
        isError={documentos.isError}
        descripcion="Documentos de tus cuentas, tarjetas y créditos, organizados por trámite."
      />
    </div>
  )
}
