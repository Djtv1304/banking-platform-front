import { SlidersHorizontal, ClipboardCheck, Building2, BookOpenText, Calculator, CalendarDays, CreditCard, FilePlus, Files, HandCoins, House, Landmark, Library, Package, ScrollText, ShieldCheck, UserPlus, UserSearch, Vault, WalletCards, type LucideIcon } from 'lucide-react'

import { canAccess, CLIENTES_ROLES, CUENTAS_ROLES, TARJETAS_ROLES, CREDITOS_ROLES, ORGANIZACION_ROLES, AUDITORIA_ROLES, getAccessProfile, hasAnyRole, PERMISOS, type AccessProfile, type Permiso } from '@/features/auth'
import { ROLES_GESTION_USUARIOS, ROLES_USUARIO } from '@/features/usuarios'
import { CATALOGOS_ROLES } from '@/features/catalogos'
import { CONTABILIDAD_ROLES } from '@/features/contabilidad'
import { BOVEDA_ROLES } from '@/features/boveda'
import { ROLES_MATRIZ_ORGANIZACION } from '@/features/organizacion/lib/accesoAuditoria'
import { PESTANAS_FIJAS, ROLES_CONSULTA_ROLES } from '@/features/seguridad'
import { ROUTE_ACCESS } from '@/app/router/route-access'
import { PARAMETROS_ROLES } from '@/features/parametros/api/parametros.contract'
import { funcionesDeRuta } from '@/app/router/funciones-ruta'
import { permiteSeccion, type MeResponse } from '@/features/auth'

export interface NavItem {
  capacidad?: 'aprobaciones'
  to: string
  label: string
  Icon: LucideIcon
  end?: boolean
  /** Perfiles que ven la opción. Sin valor = todos. El admin ve todas. */
  profiles?: readonly AccessProfile[]
  roles?: readonly string[]
  /** Se muestra solo si el usuario puede esta acción (permiso de WorkOS o rol; ver shared/lib/permisos) */
  permiso?: Permiso
  permisoAlternativo?: Permiso
  /** Módulo sin pantallas todavía: abre «Módulo en preparación» y muestra la etiqueta «Pronto» */
  enPreparacion?: boolean
}

export const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Inicio', Icon: House, end: true }, { to: '/aprobaciones', label: 'Aprobaciones', Icon: ClipboardCheck, capacidad: 'aprobaciones' }] },
  {
    title: 'Organización',
    items: [
      { to: '/organizacion/entidad', label: 'Datos de la cooperativa', Icon: Building2, profiles: ROUTE_ACCESS.datosCooperativa, roles: ORGANIZACION_ROLES.entidad },
      { to: '/parametros', label: 'Parámetros', Icon: SlidersHorizontal, roles: PARAMETROS_ROLES },
      { to: '/organizacion/agencias', label: 'Agencias', Icon: Building2, profiles: ROUTE_ACCESS.agencias, roles: ORGANIZACION_ROLES.agencias },
      { to: '/organizacion/directorios', label: 'Directorios de auditoría', Icon: UserSearch, roles: ROLES_MATRIZ_ORGANIZACION, permisoAlternativo: PERMISOS.organizacionExportar },
    ],
  },
  {
    title: 'Productos y Catálogos',
    // Productos: consultar exige prd-consultar y editar prd-editar (las páginas ocultan las acciones)
    items: [
      { to: '/productos', label: 'Productos', Icon: Package, permiso: PERMISOS.productosConsultar },
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
      { to: '/cuentas', label: 'Consultar cuentas', Icon: Landmark, profiles: ROUTE_ACCESS.consultarCuentas, roles: CUENTAS_ROLES.consultar },
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
        roles: CREDITOS_ROLES.consultar,
        enPreparacion: true,
      },
    ],
  },
  {
    title: 'Tarjetas',
    items: [
      { to: '/tarjetas', label: 'Consultar tarjetas', Icon: CreditCard, profiles: ROUTE_ACCESS.consultarTarjetas, roles: TARJETAS_ROLES.consultar },
      {
        to: '/solicitar-tarjeta',
        label: 'Solicitar tarjeta',
        Icon: FilePlus,
        profiles: ROUTE_ACCESS.solicitarTarjeta,
        roles: ['ADMIN', 'ASESOR'],
        permiso: PERMISOS.tarjetasEmitir,
      },
    ],
  },
  {
    title: 'Tesorería',
    // SUPERVISOR, CONTADOR, AUDITOR y ADMIN; la página muestra a cada rol solo lo que puede consultar
    items: [{ to: '/bovedas', label: 'Bóvedas', Icon: Vault, roles: BOVEDA_ROLES.acceso }],
  },
  {
    title: 'Cuentas contables',
    items: [
      {
        to: '/contabilidad',
        label: 'Plan de cuentas',
        Icon: Calculator,
        end: true,
        profiles: ROUTE_ACCESS.cuentasContables,
        roles: CONTABILIDAD_ROLES.consultar,
      },
      {
        to: '/contabilidad/cuentas-producto',
        label: 'Cuentas por producto',
        Icon: Package,
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
      {
        to: '/contabilidad/plantillas',
        label: 'Plantillas contables',
        Icon: Files,
        permiso: PERMISOS.plantillasEditar,
      },
      {
        to: '/contabilidad/fecha-contable',
        label: 'Fecha contable',
        Icon: CalendarDays,
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
      { to: '/seguridad/pestanas', label: 'Accesos por función', Icon: ShieldCheck, roles: ROLES_CONSULTA_ROLES },
      { to: '/seguridad/roles', label: 'Roles y accesos', Icon: ShieldCheck, roles: ROLES_CONSULTA_ROLES },
    ],
  },
  {
    // E8-01: la API valida los mismos roles; exportar exige además org-exportar
    title: 'Auditoría',
    items: [
      { to: '/auditoria', label: 'Bitácora de auditoría', Icon: ScrollText, roles: AUDITORIA_ROLES, end: true },
      { to: '/auditoria/integridad', label: 'Integridad de la bitácora', Icon: ShieldCheck, roles: AUDITORIA_ROLES },
    ],
  },
]

/** Roles por pestaña que configuró un ADMIN en «Pestañas por rol» (SEG07). Sin entrada = menú por defecto. */
export type PestanasPorRol = Readonly<Record<string, readonly string[]>>

/** Roles que ven la opción en el menú por defecto (sin personalizar). */
function rolesPorDefecto(item: NavItem) {
  return ROLES_USUARIO.filter((rol) => canAccess(getAccessProfile([rol]), item.profiles) && (!item.roles || hasAnyRole([rol], item.roles)))
}

/** Si un ADMIN personalizó la pestaña, su lista de roles reemplaza a la del código. */
function rolPuedeVer(item: NavItem, roles: readonly string[], pestanas?: PestanasPorRol) {
  const configurados = PESTANAS_FIJAS.includes(item.to) ? undefined : pestanas?.[item.to]
  if (configurados) return hasAnyRole(roles, configurados)
  return !item.roles || hasAnyRole(roles, item.roles)
}

/**
 * Solo las opciones (y secciones con al menos una opción) que el perfil puede ver. Sin `permisos`
 * (vista de un rol en «Roles y accesos») no se filtra por permiso: eso se configura en WorkOS.
 * Solo decide qué se muestra: cada API valida su propio rol o permiso.
 */
export function getVisibleSections(profile: AccessProfile | null, roles: readonly string[], permisos?: readonly string[], pestanas?: PestanasPorRol, accesos?: MeResponse['accesosSecciones'], capacidades: { aprobaciones?: boolean } = {}, autorizacion?: MeResponse['autorizacion']) {
  if (!profile) return []
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => {
        if (item.capacidad && !capacidades[item.capacidad]) return false
        const funciones = funcionesDeRuta(item.to)
        if (autorizacion?.activa && funciones) return funciones.some((f) => autorizacion.funciones.includes(f))
        return (
        canAccess(profile, item.profiles) &&
        (rolPuedeVer(item, roles, accesos ? undefined : pestanas) || Boolean(item.permisoAlternativo && permisos?.includes(item.permisoAlternativo))) &&
        permiteSeccion(item.to, accesos) &&
        (!item.permiso || !permisos || permisos.includes(item.permiso))
        )
      },
    ),
  })).filter((section) => section.items.length > 0)
}

export interface PestanaConfigurable {
  to: string
  label: string
  seccion: string
  rolesPorDefecto: string[]
  /** Además del rol, la opción exige una acción (permiso de WorkOS o rol de escritura) */
  requiereAccion: boolean
}

/** Pestañas que un ADMIN puede personalizar, con los roles que las ven por defecto. */
export function getPestanasConfigurables(): PestanaConfigurable[] {
  return NAV_SECTIONS.flatMap((section) =>
    section.items
      .filter((item) => !item.capacidad && !PESTANAS_FIJAS.includes(item.to))
      .map((item) => ({
        to: item.to,
        label: item.label,
        seccion: section.title ?? 'General',
        rolesPorDefecto: rolesPorDefecto(item),
        requiereAccion: Boolean(item.permiso),
      })),
  )
}

/** Opciones del menú para un rol reconocido. No sustituye la autorización de las APIs. */
export function getRoleNavigation(role: string, pestanas?: PestanasPorRol, autorizacion?: MeResponse['autorizacion']) {
  if (!(ROLES_USUARIO as readonly string[]).includes(role)) return []
  return getVisibleSections(getAccessProfile([role]), [role], [], pestanas, undefined, {}, autorizacion).map((section) => ({
    titulo: section.title ?? 'General',
    opciones: section.items.map((item) => ({
      titulo: item.label,
      enPreparacion: Boolean(item.enPreparacion),
    })),
  }))
}
