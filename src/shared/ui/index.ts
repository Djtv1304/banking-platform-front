// Archivo Barril (Barrel file): Expone el sistema de diseño y componentes base (Shadcn UI)
// Evita que otros módulos tengan que conocer la estructura interna de archivos de la UI.

export { Aviso, Cargando } from '@/shared/ui/aviso';
export { Badge, badgeVariants } from '@/shared/ui/badge';
export { Button, buttonVariants } from '@/shared/ui/button';
export { Checkbox } from '@/shared/ui/checkbox';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/collapsible';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
export { Input } from '@/shared/ui/input';
export { Label } from '@/shared/ui/label';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
export { ThemeToggle } from '@/shared/ui/theme-toggle';
