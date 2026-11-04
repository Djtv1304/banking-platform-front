import type { ComponentType } from 'react'

import { BalanceIllustration } from '@/features/auth/components/promo-slider/illustrations/BalanceIllustration'
import { SavingsGoalIllustration } from '@/features/auth/components/promo-slider/illustrations/SavingsGoalIllustration'
import { SecurityCodeIllustration } from '@/features/auth/components/promo-slider/illustrations/SecurityCodeIllustration'
import { SecuritySettingsIllustration } from '@/features/auth/components/promo-slider/illustrations/SecuritySettingsIllustration'

// Clases por slide. Los colores son fijos en ambos modos y salen de la paleta de marca (src/styles/index.css)
export interface SlideTheme {
  panel: string
  text: string
  body: string
  tagline: string
  stack: string
  feature: string
  check: string
  barTrack: string
  barFill: string
}

export interface Slide {
  id: string
  title: string
  bullets: string[]
  Illustration: ComponentType
  theme: SlideTheme
}

const DARK_SLIDE = {
  text: 'text-white',
  body: 'text-white/85',
  tagline: 'text-white/70',
  stack: 'bg-white/10',
  check: 'text-brand-sky',
  barTrack: 'bg-white/20',
  barFill: 'bg-white',
}

const LIGHT_SLIDE = {
  text: 'text-brand-ink',
  body: 'text-brand-ink/85',
  tagline: 'text-brand-ink/60',
  stack: 'bg-brand-ink/10',
  check: 'text-brand-ink',
  barTrack: 'bg-brand-ink/15',
  barFill: 'bg-brand-ink',
}

export const SLIDES: Slide[] = [
  {
    id: 'balance',
    title: 'Tu dinero, siempre a la vista',
    bullets: [
      'Consulta saldos y movimientos de todas tus cuentas en un solo lugar.',
      'Transfiere a otras cooperativas y bancos del país.',
      'Paga tus servicios básicos sin hacer filas.',
    ],
    Illustration: BalanceIllustration,
    theme: {
      ...DARK_SLIDE,
      panel: 'bg-brand-navy [--dots-color:rgb(255_255_255/0.06)]',
      feature: 'border border-white/10 bg-white/5',
    },
  },
  {
    id: 'savings',
    title: 'Ahorra con propósito',
    bullets: [
      'Crea metas de ahorro y aporta a tu ritmo.',
      'Simula tu inversión a plazo fijo antes de contratarla.',
      'Revisa mes a mes cuánto has ganado en intereses.',
    ],
    Illustration: SavingsGoalIllustration,
    theme: {
      ...DARK_SLIDE,
      panel: 'bg-brand-navy-deep [--dots-color:rgb(255_255_255/0.07)]',
      feature: 'border border-white/15 bg-white/8',
    },
  },
  {
    id: 'security-code',
    title: 'Código de seguridad en tu celular',
    bullets: [
      'Confirma cada ingreso y transferencia con un código temporal desde la app.',
      'Si viajas al exterior, deja la hora de tu celular en automático para que el código funcione.',
    ],
    Illustration: SecurityCodeIllustration,
    theme: {
      ...LIGHT_SLIDE,
      panel: 'bg-brand-amber [--dots-color:rgb(15_23_42/0.08)]',
      feature: 'bg-white/20',
    },
  },
  {
    id: 'security',
    title: 'Tu seguridad es primero',
    bullets: [
      'Nunca te pediremos tu clave por correo, llamada o mensaje de texto.',
      'Cambia tu contraseña periódicamente desde «Mi perfil».',
      'Bloquea tus tarjetas al instante si las pierdes.',
    ],
    Illustration: SecuritySettingsIllustration,
    theme: {
      ...LIGHT_SLIDE,
      panel: 'bg-brand-sky-soft [--dots-color:rgb(15_23_42/0.06)]',
      feature: 'bg-white',
    },
  },
]
