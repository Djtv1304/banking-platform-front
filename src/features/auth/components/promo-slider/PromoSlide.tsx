import { CircleCheck } from 'lucide-react'

import { cn } from '@/shared/lib'
import type { Slide } from './slides'

export function PromoSlide({ slide }: { slide: Slide }) {
  const { title, bullets, Illustration, theme } = slide

  return (
    <div className="flex flex-1 animate-in flex-col duration-500 fade-in">
      <div className="flex flex-1 items-center justify-center py-8" aria-hidden="true">
        {/* Doble fondo: capa translúcida que asoma por detrás de la tarjeta */}
        <div className="relative w-full max-w-[340px] pt-5">
          <div className={cn('absolute inset-x-[10%] top-0 h-16 rounded-t-3xl', theme.stack)} />
          <div className="relative">
            <Illustration />
          </div>
        </div>
      </div>

      <div className={cn('rounded-3xl p-6', theme.feature)}>
        <h2 className={cn('text-[22px] leading-tight font-bold', theme.text)}>{title}</h2>
        <ul className="mt-4 flex flex-col gap-3.5">
          {bullets.map((bullet) => (
            <li key={bullet} className={cn('flex gap-3 text-base leading-snug', theme.body)}>
              <CircleCheck className={cn('mt-0.5 size-5 shrink-0', theme.check)} />
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
