import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

// La misma clave la lee el script inline de index.html para evitar el parpadeo inicial
export const THEME_STORAGE_KEY = 'enquocoop-theme'

interface ThemeState {
  theme: Theme
  toggleTheme: () => void
}

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: getSystemTheme(),
      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    }),
    { name: THEME_STORAGE_KEY, partialize: ({ theme }) => ({ theme }) },
  ),
)

// Sincroniza la clase .dark de <html> con el store durante toda la vida de la app
export function initTheme() {
  applyTheme(useThemeStore.getState().theme)
  useThemeStore.subscribe(({ theme }) => applyTheme(theme))
}
