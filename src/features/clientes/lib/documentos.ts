import { CreditCard, FileSignature, FolderOpen, HandCoins, IdCard, Landmark, type LucideIcon } from 'lucide-react'

import type { CategoriaDocumento } from '@/features/clientes/api/clientes.contract'

/*
 * Organización de los documentos del cliente: agrupados por el trámite que los originó, en el
 * orden en que normalmente ocurren (identificación → apertura → contrato → tarjeta → crédito).
 * TODO(API): confirmar los códigos de categoría (o si vendrán de un catálogo).
 */
export const CATEGORIAS_DOCUMENTO: readonly {
  value: CategoriaDocumento
  label: string
  descripcion: string
  Icon: LucideIcon
}[] = [
  {
    value: 'IDENTIFICACION',
    label: 'Identificación',
    descripcion: 'Cédula, RUC, pasaporte y nombramientos',
    Icon: IdCard,
  },
  {
    value: 'APERTURA_CUENTA',
    label: 'Apertura de cuenta',
    descripcion: 'Formularios y respaldos entregados al abrir una cuenta',
    Icon: Landmark,
  },
  {
    value: 'CONTRATO_CUENTA',
    label: 'Contratos de cuenta',
    descripcion: 'Contratos firmados de cada cuenta',
    Icon: FileSignature,
  },
  {
    value: 'SOLICITUD_TARJETA',
    label: 'Solicitud de tarjeta',
    descripcion: 'Solicitudes de tarjetas de débito y crédito',
    Icon: CreditCard,
  },
  { value: 'CREDITO', label: 'Créditos', descripcion: 'Solicitudes, pagarés y tablas de amortización', Icon: HandCoins },
  { value: 'OTROS', label: 'Otros', descripcion: 'Certificados y documentos varios', Icon: FolderOpen },
]

export const ARCHIVO_TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png'] as const
export const ARCHIVO_TAMANO_MAXIMO = 10 * 1024 * 1024 // 10 MB

export function formatearTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

export function formatearFecha(iso: string, conHora = false) {
  return new Intl.DateTimeFormat('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(conHora && { hour: '2-digit', minute: '2-digit' }),
    // Una fecha sin hora (YYYY-MM-DD) se interpreta como local para no correrse un día
  }).format(new Date(iso.length === 10 ? `${iso}T00:00:00` : iso))
}
