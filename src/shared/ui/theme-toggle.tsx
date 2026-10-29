import { Moon, Sun } from "lucide-react"

import { cn } from "@/shared/lib/utils"
import { useThemeStore } from "@/shared/theme"
import { Button } from "./button"

function ThemeToggle({ className }: { className?: string }) {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const isDark = theme === "dark"

  return (
    <Button
      type="button"
      variant="outline"
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className={cn(
        "h-11 gap-2.5 rounded-full border-border bg-card px-5 text-[15px] font-medium text-foreground shadow-none hover:bg-muted dark:border-border dark:bg-card dark:hover:bg-muted",
        className
      )}
    >
      {isDark ? (
        <Moon className="size-[18px] text-info" />
      ) : (
        <Sun className="size-[18px] text-brand-amber" />
      )}
      {isDark ? "Modo oscuro" : "Modo claro"}
    </Button>
  )
}

export { ThemeToggle }
