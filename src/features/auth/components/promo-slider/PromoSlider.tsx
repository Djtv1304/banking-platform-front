import { useState } from 'react'

import { cn } from '@/shared/lib'
import { PromoSlide } from '@/features/auth/components/promo-slider/PromoSlide'
import { SLIDES } from '@/features/auth/components/promo-slider/slides'
import { useInstitucion } from '@/shared/institucion'

/*
 * El avance automático lo marca la animación de la barra activa (7 s, `animate-slide-progress` en index.css):
 * al terminar pasa a la siguiente slide. Pasar el mouse o enfocar el slider pausa la animación, y con
 * `prefers-reduced-motion` no hay animación ni avance automático.
 */
export function PromoSlider() {
  const { nombre, sitioWeb } = useInstitucion()
  const [activeIndex, setActiveIndex] = useState(0)
  const activeSlide = SLIDES[activeIndex]
  const { theme } = activeSlide

  const goToNext = () => setActiveIndex((index) => (index + 1) % SLIDES.length)

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Novedades del sistema"
      className={cn(
        'group/slider flex flex-1 flex-col overflow-hidden rounded-[28px] bg-dots p-9 transition-colors duration-500',
        theme.panel
      )}
    >
      <header className="flex items-center justify-between gap-4">
        <span className={cn('min-w-0 break-words text-[26px] font-bold tracking-tight transition-colors duration-500', theme.text)}>
          {sitioWeb ? (
            <a href={sitioWeb} target="_blank" rel="noopener noreferrer" title={`Sitio web de ${nombre}`}>{nombre}</a>
          ) : nombre}
        </span>
        <span
          className={cn(
            'text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-500',
            theme.tagline
          )}
        >
          Sistema de gestión
        </span>
      </header>

      <PromoSlide key={activeSlide.id} slide={activeSlide} />

      <div className="mt-8 grid grid-cols-4 gap-2.5">
        {SLIDES.map((slide, index) => {
          const isActive = index === activeIndex

          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Ver «${slide.title}»`}
              aria-current={isActive ? 'true' : undefined}
              className="-my-2 rounded-full py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={cn('block h-1 overflow-hidden rounded-full', theme.barTrack)}>
                <span
                  onAnimationEnd={isActive ? goToNext : undefined}
                  className={cn(
                    'block h-full rounded-full',
                    theme.barFill,
                    index < activeIndex && 'w-full',
                    index > activeIndex && 'w-0',
                    isActive &&
                      'w-0 animate-slide-progress group-focus-within/slider:[animation-play-state:paused] group-hover/slider:[animation-play-state:paused] motion-reduce:w-full motion-reduce:animate-none'
                  )}
                />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
