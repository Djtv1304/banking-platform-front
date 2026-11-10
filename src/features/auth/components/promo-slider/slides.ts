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
    title: 'La ficha del cliente, completa',
    bullets: [
      'Busca clientes por identificación o por nombre y abre su ficha.',
      'Consulta saldos, movimientos y cupos de cada cuenta.',
      'Revisa sus tarjetas y su estado sin cambiar de pantalla.',
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
    title: 'Un sistema por módulos',
    bullets: [
      'Clientes, cuentas, créditos y tarjetas, cada uno en su módulo.',
      'Cada funcionario ve sólo las opciones de su rol.',
      'Los módulos nuevos se suman sin cambiar tu forma de trabajar.',
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
    title: 'Verificación en dos pasos',
    bullets: [
      'Además de tu contraseña, el ingreso pide un código temporal de tu app de autenticación.',
      'Si el código no funciona, revisa que la hora de tu dispositivo esté en automático.',
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
    title: 'Tu usuario es personal',
    bullets: [
      'Nunca compartas tu usuario ni tu contraseña con otro funcionario.',
      'Cierra sesión al dejar tu puesto: la sesión vence sola a las 8 horas.',
      'Cada operación queda registrada con tu usuario.',
    ],
    Illustration: SecuritySettingsIllustration,
    theme: {
      ...LIGHT_SLIDE,
      panel: 'bg-brand-sky-soft [--dots-color:rgb(15_23_42/0.06)]',
      feature: 'bg-white',
    },
  },
]
