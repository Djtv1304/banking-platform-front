import { Construction } from 'lucide-react'
import { Link } from 'react-router'

/** Pantalla de los módulos del menú que todavía no tienen funcionalidad */
export function ModuloEnPreparacion({ modulo, descripcion }: { modulo: string; descripcion: string }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-link">
        <Construction className="size-6" />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-heading">{modulo}</h1>
      <p className="mt-2 text-sm font-medium text-heading">Este módulo está en preparación.</p>
      <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>
      <Link to="/" className="mt-6 inline-block text-sm font-medium text-link hover:underline">
        Volver al inicio
      </Link>
    </div>
  )
}
