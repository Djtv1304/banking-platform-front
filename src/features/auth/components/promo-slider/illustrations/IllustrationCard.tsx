import type { ReactNode } from 'react'

import { cn } from '@/shared/lib'

// Tarjeta blanca base de las ilustraciones: se ve igual en modo claro y oscuro
export function IllustrationCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl bg-white p-5 text-brand-ink shadow-xl shadow-black/20', className)}>
      {children}
    </div>
  )
}
