import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Bell, CircleHelp, House, LogOut, Moon, PanelLeft, Sun, UserPlus, type LucideIcon } from 'lucide-react'

import { signOut, useAuthStore } from '@/features/auth'
import { cn } from '@/shared/lib'
import { useThemeStore } from '@/shared/theme'
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
}

const NAV_SECTIONS: { title?: string; items: NavItem[] }[] = [
  { items: [{ to: '/', label: 'Inicio', Icon: House, end: true }] },
  { title: 'Clientes', items: [{ to: '/register', label: 'Registrar cliente', Icon: UserPlus }] },
]

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
  const currentPage = NAV_SECTIONS.flatMap((section) => section.items).find(({ to, end }) =>
    end ? pathname === to : pathname.startsWith(to),
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
          {NAV_SECTIONS.map((section, index) => (
            <div key={section.title ?? index} className="flex flex-col gap-0.5">
              {section.title &&
                (collapsed ? (
                  <hr className="mx-2 my-3 border-sidebar-border" />
                ) : (
                  <p className="mt-5 mb-1 px-2.5 text-xs font-medium text-muted-foreground">{section.title}</p>
                ))}
              {section.items.map(({ to, label, Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                      collapsed && 'justify-center px-0',
                      isActive
                        ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('size-[18px] shrink-0', isActive && 'text-link')} />
                      {!collapsed && <span className="truncate">{label}</span>}
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
          <p className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden font-semibold text-heading sm:inline">Banca Virtual</span>
            <span className="hidden text-muted-foreground sm:inline">/</span>
            <span className="truncate text-muted-foreground">{currentPage?.label}</span>
          </p>

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
              className="relative size-9 rounded-lg text-muted-foreground"
            >
              <Bell className="size-[18px]" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-brand-amber ring-2 ring-card" />
            </Button>
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

function UserMenu() {
  const user = useAuthStore((state) => state.user)
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
          {user && user.roles.length > 0 && (
            <span className="mt-1.5 flex flex-wrap gap-1">
              {user.roles.map((role) => (
                <Badge key={role} className="h-5 bg-info/30 px-2 text-xs text-foreground capitalize">
                  {role}
                </Badge>
              ))}
            </span>
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
