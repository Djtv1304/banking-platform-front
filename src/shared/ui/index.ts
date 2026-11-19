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
export { FechaInput } from '@/shared/ui/fecha-input';
export { Label } from '@/shared/ui/label';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
export { ThemeToggle } from '@/shared/ui/theme-toggle';
export { Paginacion } from '@/shared/ui/paginacion';
export { ModuloEnPreparacion } from '@/shared/ui/modulo-en-preparacion';

export { ComparadorCambios } from '@/shared/ui/comparador-cambios';
export { LineaDeTiempo } from '@/shared/ui/linea-de-tiempo';
export { AvisoRequiereAprobacion } from '@/shared/ui/aviso-requiere-aprobacion';
export { ErrorApi } from '@/shared/ui/error-api';
export { EstadoPantalla, type EstadoDePantalla, type EstadoPantallaProps } from '@/shared/ui/estado-pantalla';
export { InsigniaEstado, type InsigniaEstadoProps, type TonoInsignia } from '@/shared/ui/insignia-estado';
export { Textarea } from '@/shared/ui/textarea';
export { DialogoConfirmacion, type DialogoConfirmacionProps, type MotivoConfirmacion } from '@/shared/ui/dialogo-confirmacion';
