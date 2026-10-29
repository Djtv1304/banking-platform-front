import { Lock } from 'lucide-react'

import { IllustrationCard } from './IllustrationCard'

const CODE = ['4', '8', '2', '9', '1', '6']
const SECONDS_LEFT = 24
const CODE_LIFETIME = 60
const RING_RADIUS = 15
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

export function SecurityCodeIllustration() {
  return (
    <div className="relative pb-5">
      <IllustrationCard className="pb-7">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-navy">
            <Lock className="size-4 text-brand-amber" />
          </span>
          <span className="flex-1">
            <span className="block text-sm font-semibold">Código de seguridad</span>
            <span className="block text-xs text-brand-slate">App EnquoCoop</span>
          </span>
          <span className="relative flex size-9 items-center justify-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r={RING_RADIUS} fill="none" strokeWidth="2.5" className="stroke-brand-mist" />
              <circle
                cx="18"
                cy="18"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH * (1 - SECONDS_LEFT / CODE_LIFETIME)}
                className="stroke-brand-amber"
              />
            </svg>
            <span className="text-[10px] font-semibold">{SECONDS_LEFT}s</span>
          </span>
        </div>

        <div className="mt-5 grid grid-cols-6 gap-2">
          {CODE.map((digit, index) => (
            <span
              key={index}
              className="flex h-11 items-center justify-center rounded-lg border border-brand-border text-lg font-semibold"
            >
              {digit}
            </span>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-brand-slate">
          Úsalo para confirmar tu ingreso. Cambia cada 60 segundos.
        </p>
      </IllustrationCard>

      <span className="absolute bottom-0 left-[6%] rounded-full bg-brand-navy px-4 py-2 text-xs font-medium text-white shadow-lg shadow-black/25">
        Ingreso solicitado · Chrome en Windows
      </span>
    </div>
  )
}
