// Archivo Barril (Barrel file): Expone el sistema de diseño y componentes base (Shadcn UI)
// Evita que otros módulos tengan que conocer la estructura interna de archivos de la UI.

export { Badge, badgeVariants } from './badge';
export { Button, buttonVariants } from './button';
export { Checkbox } from './checkbox';
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
export { Input } from './input';
export { Label } from './label';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export { ThemeToggle } from './theme-toggle';
