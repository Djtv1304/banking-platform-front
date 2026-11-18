import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Outlet, useLocation } from 'react-router'
import {
  Bell,
  CircleHelp,
  LogOut,
  Moon,
  PanelLeft,
  Sun,
} from 'lucide-react'

import { ActualizarAccesosButton, AvisoInactividad, obtenerContextoAgencias, SelectorAgencia, formatRol, formatRoles, signOut, useAccessProfile, useAuthStore, usePermisos } from '@/features/auth'
import { getVisibleSections, type NavItem } from '@/app/navigation/navigation'
import { usePestanas } from '@/features/seguridad'
import { cn } from '@/shared/lib'
import { useThemeStore } from '@/shared/theme'
import { useAgencias } from '@/features/catalogos'
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
  const permisos = usePermisos()
  const accesos = useAuthStore((state) => state.user?.accesosSecciones)
  // Si la configuración no llega (error o tabla sin crear) se usa el menú por defecto
  const pestanas = usePestanas(Boolean(roles?.length)).data
  const sections = getVisibleSections(useAccessProfile(), roles ?? [], permisos, pestanas && Object.fromEntries(pestanas.map((p) => [p.pestana, p.roles])), accesos)
  const currentPage = sections
    .flatMap((section) => section.items.map((item) => ({ ...item, sectionTitle: section.title })))
    .filter(({ to, end }) => (end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)))
    // La más específica gana: en /cuentas/abrir es «Abrir cuenta», no «Consultar cuentas»
    .reduce<(NavItem & { sectionTitle?: string }) | undefined>(
      (best, item) => (!best || item.to.length > best.to.length ? item : best),
      undefined,
    )

  return (
    <div className="flex h-svh bg-panel print:block print:h-auto print:bg-white">
      <aside
        className={cn(
          'flex shrink-0 flex-col print:hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
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
        <header className="print:hidden flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
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
            <ActualizarAccesosButton />
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

        <div className="print:hidden border-b border-border bg-card px-4 py-2 sm:px-6"><SelectorAgencia /></div>
        <main className="print:overflow-visible print:p-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <Outlet />
        </main>
      </div>
      <AvisoInactividad />
    </div>
  )
}

/** Agencia del usuario: «Agencia <nombre>» (o el id mientras el catálogo no responda) o «Sin agencia asignada» */
function useAgenciaLabel() {
  const idAgencia = useAuthStore((state) => state.user?.idAgencia ?? null)
  const { data: agencias } = useAgencias()
  const contexto = useQuery({ queryKey: ['auth', 'agencias'], queryFn: ({ signal }) => obtenerContextoAgencias(signal), retry: false })
  if (contexto.data?.alcanceGlobal || (contexto.data?.accesoTodasAgencias && contexto.data.agenciasPermitidas.length > 1)) return 'Acceso a todas las agencias'
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
