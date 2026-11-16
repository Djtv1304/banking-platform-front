import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import {
  Bell,
  Building2,
  Calculator,
  CircleHelp,
  CreditCard,
  HandCoins,
  House,
  Landmark,
  LogOut,
  Moon,
  Package,
  PanelLeft,
  ShieldCheck,
  Library,
  Sun,
  UserPlus,
  UserSearch,
  WalletCards,
  type LucideIcon,
} from 'lucide-react'

import { canAccess, CLIENTES_ROLES, hasAnyRole, formatRol, formatRoles, signOut, useAccessProfile, useAuthStore, type AccessProfile } from '@/features/auth'
import { ROUTE_ACCESS } from '@/app/router/route-access'
import { ROLES_GESTION_USUARIOS } from '@/features/usuarios'
import { PRODUCTOS_ROLES } from '@/features/organizacion'
import { cn } from '@/shared/lib'
import { useThemeStore } from '@/shared/theme'
import { CATALOGOS_ROLES, useAgencias } from '@/features/catalogos'
import { CONTABILIDAD_ROLES } from '@/features/contabilidad'
import { INSTITUCION } from '@/shared/config'
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui'

interface NavItem {
  to: string
  label: string
  Icon: LucideIcon
  end?: boolean
  /** Perfiles que ven la opción. Sin valor = todos. El admin ve todas. */
  profiles?: readonly AccessProfile[]
  roles?: readonly string[]
  /** Módulo sin pantallas todavía: abre «Módulo en preparación» y muestra la etiqueta «Pronto» */
  enPreparacion?: boolean
}

const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
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
    // ADMIN administra; ASESOR solo consulta (las páginas ocultan las acciones)
    items: [
      { to: '/productos', label: 'Productos', Icon: Package, roles: PRODUCTOS_ROLES.consultar },
      { to: '/catalogos', label: 'Catálogos', Icon: Library, roles: CATALOGOS_ROLES.consultar },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { to: '/registrar-cliente', label: 'Registrar cliente', Icon: UserPlus, profiles: ROUTE_ACCESS.registrarCliente, roles: CLIENTES_ROLES.registrar },
      { to: '/clientes-busqueda', label: 'Consultar clientes', Icon: UserSearch, profiles: ROUTE_ACCESS.consultarClientes, roles: CLIENTES_ROLES.consultar },
    ],
  },
  {
    title: 'Cuentas',
    items: [
      { to: '/cuentas', label: 'Consultar cuentas', Icon: Landmark, profiles: ROUTE_ACCESS.consultarCuentas },
      { to: '/cuentas/abrir', label: 'Abrir cuenta', Icon: WalletCards, profiles: ROUTE_ACCESS.abrirCuenta },
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
    ],
  },
]

/** Solo las opciones (y secciones con al menos una opción) que el perfil puede ver */
function getVisibleSections(profile: AccessProfile | null, roles: readonly string[]) {
  if (!profile) return []
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canAccess(profile, item.profiles) && (!item.roles || hasAnyRole(roles, item.roles))),
  })).filter((section) => section.items.length > 0)
}

const SIDEBAR_STORAGE_KEY = 'enquocoop-sidebar-collapsed'

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    return saved ? saved === 'true' : window.innerWidth < 1024
  })

  useEffect(() => localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed)), [collapsed])

  return [collapsed, () => setCollapsed((value) => !value)] as const
}

// Layout exclusivo para usuarios autenticados (lo protege RequireAuth en el router)
export function DashboardLayout() {
  const [collapsed, toggleCollapsed] = useSidebarCollapsed()
  const { pathname } = useLocation()
  const roles = useAuthStore((state) => state.user?.roles)
  const sections = getVisibleSections(useAccessProfile(), roles ?? [])
  const currentPage = sections
    .flatMap((section) => section.items.map((item) => ({ ...item, sectionTitle: section.title })))
    .filter(({ to, end }) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)))
    // La más específica gana: en /cuentas/abrir es «Abrir cuenta», no «Consultar cuentas»
    .reduce<(NavItem & { sectionTitle?: string }) | undefined>(
      (best, item) => (!best || item.to.length > best.to.length ? item : best),
      undefined,
    )

  return (
    <div className="flex h-svh bg-panel">
      <aside
        className={cn(
          'flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className={cn('flex h-14 items-center gap-2 px-3', collapsed ? 'justify-center' : 'justify-between')}>
          {!collapsed && (
            <span className="flex min-w-0 items-center gap-2.5 pl-1">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-amber text-sm font-bold text-brand-ink">
                E
              </span>
              <span className="truncate text-[17px] font-bold tracking-tight text-heading">EnquoCoop</span>
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
            title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <PanelLeft className="size-[18px]" />
          </Button>
        </div>

        <nav aria-label="Secciones" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          {sections.map((section, index) => (
            <div key={section.title ?? index} className="flex flex-col gap-0.5">
              {section.title &&
                (collapsed ? (
                  <hr className="mx-2 my-3 border-sidebar-border" />
                ) : (
                  <p className="mt-5 mb-1 px-2.5 text-xs font-medium text-muted-foreground">{section.title}</p>
                ))}
              {section.items.map(({ to, label, Icon, end, enPreparacion }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={collapsed ? (enPreparacion ? `${label} (en preparación)` : label) : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                      collapsed && 'justify-center px-0',
                      isActive && currentPage?.to === to
                        ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('size-[18px] shrink-0', isActive && currentPage?.to === to && 'text-link')} />
                      {!collapsed && <span className="truncate">{label}</span>}
                      {!collapsed && enPreparacion && (
                        <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          Pronto
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
          {currentPage && (
            <p className="flex min-w-0 items-center gap-2 text-sm">
              {currentPage.sectionTitle && (
                <>
                  <span className="hidden font-semibold text-heading sm:inline">{currentPage.sectionTitle}</span>
                  <span className="hidden text-muted-foreground sm:inline">/</span>
                </>
              )}
              <span className="truncate text-muted-foreground">{currentPage.label}</span>
            </p>
          )}

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ayuda"
              title="Ayuda"
              className="size-9 rounded-lg text-muted-foreground"
            >
              <CircleHelp className="size-[18px]" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notificaciones"
              title="Notificaciones"
              className="size-9 rounded-lg text-muted-foreground"
            >
              <Bell className="size-[18px]" />
            </Button>
            <HeaderUser />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

/** Agencia del usuario: «Agencia <nombre>» (o el id mientras el catálogo no responda) o «Sin agencia asignada» */
function useAgenciaLabel() {
  const idAgencia = useAuthStore((state) => state.user?.idAgencia ?? null)
  const { data: agencias } = useAgencias()
  if (!idAgencia) return 'Sin agencia asignada'
  const agencia = agencias?.find((item) => item.idAgencia === idAgencia)
  return `Agencia ${agencia?.nombre ?? idAgencia}`
}

/** Usuario, rol, agencia e institución en el encabezado (desde `md`; en móvil se ven en el menú de usuario) */
function HeaderUser() {
  const user = useAuthStore((state) => state.user)
  const agencia = useAgenciaLabel()
  if (!user) return null

  return (
    <div className="ml-2 hidden max-w-72 min-w-0 flex-col items-end md:flex">
      <span className="max-w-full truncate text-sm font-semibold text-heading">{user.nombre || user.email}</span>
      <span className="max-w-full truncate text-xs text-muted-foreground">
        {formatRoles(user.roles)} · {agencia} · {INSTITUCION.nombre}
      </span>
    </div>
  )
}

function UserMenu() {
  const user = useAuthStore((state) => state.user)
  const agencia = useAgenciaLabel()
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const [signingOut, setSigningOut] = useState(false)
  const displayName = user?.nombre || user?.email || ''
  const isDark = theme === 'dark'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menú de usuario"
        className="ml-2 flex size-9 items-center justify-center rounded-full bg-brand-amber text-sm font-semibold text-brand-ink outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {displayName.slice(0, 1).toUpperCase() || '?'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 rounded-xl p-1.5">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2 font-normal">
          <span className="truncate text-sm font-semibold text-heading">{displayName}</span>
          <span className="truncate text-sm text-muted-foreground">{user?.email}</span>
          <span className="truncate text-xs text-muted-foreground">
            {agencia} · {INSTITUCION.nombre}
          </span>
          {user && user.roles.length > 0 ? (
            <span className="mt-1.5 flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <Badge key={role} className="h-5 bg-info/30 px-2 text-xs text-foreground">
                  {formatRol(role)}
                </Badge>
              ))}
            </span>
          ) : (
            <span className="mt-1.5 text-xs text-muted-foreground">Sin rol asignado</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            toggleTheme()
          }}
          className="h-9 gap-2.5 rounded-lg px-2.5"
        >
          {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
          Tema
          <span className="ml-auto text-xs text-muted-foreground">{isDark ? 'Oscuro' : 'Claro'}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          onSelect={() => {
            setSigningOut(true)
            void signOut()
          }}
          className="h-9 gap-2.5 rounded-lg px-2.5"
        >
          <LogOut className="size-4" />
          {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
