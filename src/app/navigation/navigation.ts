import { Building2, BookOpenText, Calculator, CreditCard, HandCoins, House, Landmark, Library, Package, ShieldCheck, UserPlus, UserSearch, WalletCards, type LucideIcon } from 'lucide-react'

import { canAccess, CLIENTES_ROLES, getAccessProfile, hasAnyRole, PERMISOS, type AccessProfile, type Permiso } from '@/features/auth'
import { ROLES_GESTION_USUARIOS, ROLES_USUARIO } from '@/features/usuarios'
import { PRODUCTOS_ROLES } from '@/features/organizacion'
import { CATALOGOS_ROLES } from '@/features/catalogos'
import { CONTABILIDAD_ROLES } from '@/features/contabilidad'
import { ROLES_CONSULTA_ROLES } from '@/features/seguridad'
import { ROUTE_ACCESS } from '@/app/router/route-access'

export interface NavItem {
  to: string
  label: string
  Icon: LucideIcon
  end?: boolean
  /** Perfiles que ven la opción. Sin valor = todos. El admin ve todas. */
  profiles?: readonly AccessProfile[]
  roles?: readonly string[]
  /** Opción que solo sirve para escribir: se muestra con este permiso de WorkOS */
  permiso?: Permiso
  /** Módulo sin pantallas todavía: abre «Módulo en preparación» y muestra la etiqueta «Pronto» */
  enPreparacion?: boolean
}

export const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Inicio', Icon: House, end: true }] },
  {
    title: 'Organización',
    items: [
      { to: '/organizacion/entidad', label: 'Datos de la cooperativa', Icon: Building2, profiles: ROUTE_ACCESS.datosCooperativa, roles: ['ADMIN', 'ASESOR'] },
      { to: '/organizacion/agencias', label: 'Agencias', Icon: Building2, profiles: ROUTE_ACCESS.agencias },
    ],
  },
  {
    title: 'Productos y Catálogos',
    // ADMIN, SUPERVISOR y ASESOR consultan; editar depende del permiso (las páginas ocultan las acciones)
    items: [
      { to: '/productos', label: 'Productos', Icon: Package, roles: PRODUCTOS_ROLES.consultar },
      { to: '/catalogos', label: 'Catálogos', Icon: Library, roles: CATALOGOS_ROLES.consultar },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { to: '/registrar-cliente', label: 'Registrar cliente', Icon: UserPlus, profiles: ROUTE_ACCESS.registrarCliente, permiso: PERMISOS.clientesEditar },
      { to: '/clientes-busqueda', label: 'Consultar clientes', Icon: UserSearch, profiles: ROUTE_ACCESS.consultarClientes, roles: CLIENTES_ROLES.consultar },
    ],
  },
  {
    title: 'Cuentas',
    items: [
      { to: '/cuentas', label: 'Consultar cuentas', Icon: Landmark, profiles: ROUTE_ACCESS.consultarCuentas },
      { to: '/cuentas/abrir', label: 'Abrir cuenta', Icon: WalletCards, profiles: ROUTE_ACCESS.abrirCuenta, permiso: PERMISOS.cuentasAbrir },
    ],
  },
  {
    title: 'Créditos',
    items: [
      {
        to: '/creditos',
        label: 'Solicitudes de crédito',
        Icon: HandCoins,
        profiles: ROUTE_ACCESS.creditos,
        enPreparacion: true,
      },
    ],
  },
  {
    title: 'Tarjetas',
    items: [{ to: '/tarjetas', label: 'Consultar tarjetas', Icon: CreditCard, profiles: ROUTE_ACCESS.consultarTarjetas }],
  },
  {
    title: 'Cuentas contables',
    items: [
      {
        to: '/contabilidad',
        label: 'Plan de cuentas',
        Icon: Calculator,
        profiles: ROUTE_ACCESS.cuentasContables,
        roles: CONTABILIDAD_ROLES.consultar,
      },
      {
        to: '/contabilidad/asientos',
        label: 'Asientos contables',
        Icon: BookOpenText,
        profiles: ROUTE_ACCESS.cuentasContables,
        roles: CONTABILIDAD_ROLES.consultar,
      },
    ],
  },
  {
    title: 'Accesos y roles',
    items: [
      {
        to: '/usuarios',
        label: 'Usuarios del sistema',
        Icon: ShieldCheck,
        profiles: ROUTE_ACCESS.gestionUsuarios,
        roles: ROLES_GESTION_USUARIOS,
      },
      { to: '/seguridad/roles', label: 'Roles y accesos', Icon: ShieldCheck, roles: ROLES_CONSULTA_ROLES },
    ],
  },
]

/**
 * Solo las opciones (y secciones con al menos una opción) que el perfil puede ver. Sin `permisos`
 * (vista de un rol en «Roles y accesos») no se filtra por permiso: eso se configura en WorkOS.
 */
export function getVisibleSections(profile: AccessProfile | null, roles: readonly string[], permisos?: readonly string[]) {
  if (!profile) return []
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        canAccess(profile, item.profiles) &&
        (!item.roles || hasAnyRole(roles, item.roles)) &&
        (!item.permiso || !permisos || permisos.includes(item.permiso)),
    ),
  })).filter((section) => section.items.length > 0)
}

/** Opciones del menú para un rol reconocido. No sustituye la autorización de las APIs. */
export function getRoleNavigation(role: string) {
  if (!(ROLES_USUARIO as readonly string[]).includes(role)) return []
  return getVisibleSections(getAccessProfile([role]), [role]).map((section) => ({
    titulo: section.title ?? 'General',
    opciones: section.items.map((item) => ({
      titulo: item.label,
      enPreparacion: Boolean(item.enPreparacion),
    })),
  }))
}
